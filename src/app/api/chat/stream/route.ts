//file-path: chatgpt-clone-mobile\src\app\api\chat\stream\route.ts


import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/server/supabaseClient";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  const { message, sessionId } = await request.json();

  // Create a ReadableStream for Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        // Insert user message first
        await supabase
          .from("messages")
          .insert([
            {
              role: "user",
              content: message,
              session_id: sessionId,
            },
          ]);

        // Initialize Gemini with streaming
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.0-flash-exp",
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.7,
          },
        });

        // Generate streaming content
        const result = await model.generateContentStream({
          contents: [
            {
              role: "user",
              parts: [{ text: message }],
            },
          ],
        });

        let fullResponse = "";

        // Stream each chunk
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullResponse += chunkText;
          
          // Send chunk to client
          const data = JSON.stringify({ 
            chunk: chunkText,
            done: false 
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        // Insert complete AI response to Supabase
        await supabase
          .from("messages")
          .insert([
            {
              role: "assistant",
              content: fullResponse,
              session_id: sessionId,
            },
          ]);

        // Send completion signal
        const doneData = JSON.stringify({ 
          chunk: "",
          done: true,
          fullResponse 
        });
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
        
      } catch (error) {
        console.error("Streaming error:", error);
        const errorData = JSON.stringify({ 
          error: "Sorry, I'm having trouble responding right now.",
          done: true 
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

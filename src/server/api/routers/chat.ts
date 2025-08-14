import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { supabase } from "../../supabaseClient";
import { v4 as uuidv4 } from "uuid";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

let currentSessionId = uuidv4();

export const chatRouter = router({
  // Get messages for a session
  getMessages: publicProcedure
    .input(z.object({ session_id: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", input.session_id)
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);
      return data;
    }),

  // Send message for a session
  sendMessage: publicProcedure
    .input(
      z.object({
        content: z.string(),
        session_id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Insert user message into Supabase
      const { error: userError } = await supabase
        .from("messages")
        .insert([
          {
            role: "user",
            content: input.content,
            session_id: input.session_id,
          },
        ]);

      if (userError) throw new Error(userError.message);

      // 2. Generate AI reply using Gemini
      try {
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.0-flash-exp",
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.7,
          },
        });
        
        const result = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [{ text: input.content }],
            },
          ],
        });

        // Better response extraction
        let aiReply = "I'm sorry, I couldn't generate a reply.";
        
        if (result.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
          aiReply = result.response.candidates[0].content.parts[0].text;
        }

        // 3. Insert AI reply into Supabase
        const { error: aiError } = await supabase
          .from("messages")
          .insert([
            {
              role: "assistant",
              content: aiReply,
              session_id: input.session_id,
            },
          ]);

        if (aiError) throw new Error(aiError.message);

        // Return the AI response so frontend can use it
        return { 
          success: true, 
          aiResponse: aiReply 
        };

      } catch (error) {
        console.error("Gemini API error:", error);
        
        // Insert error message
        const errorMessage = "Sorry, I'm having trouble responding right now. Please try again.";
        await supabase
          .from("messages")
          .insert([
            {
              role: "assistant",
              content: errorMessage,
              session_id: input.session_id,
            },
          ]);

        return { 
          success: false, 
          aiResponse: errorMessage 
        };
      }
    }),

  // Create new session
  newSession: publicProcedure.mutation(() => {
    currentSessionId = uuidv4();
    return { sessionId: currentSessionId };
  }),
});

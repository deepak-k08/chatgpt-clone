// file-path: chatgpt-clone-mobile/src/server/api/routers/chat.ts

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

      // 2. Generate AI reply using Gemini (latest model)
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: input.content }],
          },
        ],
      });

      const aiReply =
        result.response.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm sorry, I couldn't generate a reply.";

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

      return { success: true };
    }),

  // Create new session
  newSession: publicProcedure.mutation(() => {
    currentSessionId = uuidv4();
    return { sessionId: currentSessionId };
  }),
});

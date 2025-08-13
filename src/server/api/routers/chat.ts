import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { supabase } from "../../supabaseClient";
import { v4 as uuidv4 } from "uuid";

let currentSessionId = uuidv4();
// tRPC router for chat
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
      // 1. Insert user message
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

      // 2. Generate AI response (placeholder)
      const aiReply = `You said: ${input.content}`;

      // 3. Insert AI reply
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
     newSession: publicProcedure.mutation(() => {
    currentSessionId = uuidv4();
    return { sessionId: currentSessionId };
  }),
});

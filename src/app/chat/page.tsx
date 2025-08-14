//file-path: chatgpt-clone-mobile/src/app/chat/page.tsx


import { z } from "zod";
import { router, publicProcedure } from "../../server/api/trpc";
import { supabase } from "../../server/supabaseClient";

// Fetch messages for a given session
export const chatRouter = router({
  getMessages: publicProcedure
    .input(z.object({ session_id: z.string() }))
    .query(
      async ({
        input,
      }: {
        input: { session_id: string };
      }) => {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("session_id", input.session_id)
          .order("created_at", { ascending: true });

        if (error) throw new Error(error.message);
        return data;
      }
    ),

  sendMessage: publicProcedure
    .input(
      z.object({
        content: z.string(),
        session_id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Insert user message
      const { error: insertUserError } = await supabase
        .from("messages")
        .insert([
          {
            role: "user",
            content: input.content,
            session_id: input.session_id,
          },
        ]);
      if (insertUserError) throw new Error(insertUserError.message);

      // Simulate AI reply
      const aiReply = `You said: ${input.content}`;

      const { error: insertAiError } = await supabase
        .from("messages")
        .insert([
          {
            role: "assistant",
            content: aiReply,
            session_id: input.session_id,
          },
        ]);
      if (insertAiError) throw new Error(insertAiError.message);

      return { success: true };
    }),
});

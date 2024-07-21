import {
  type PublicAPI,
  createTRPCRouter,
  publicMutation,
  publicQuery,
} from "@/server/api/trpc";
import { z } from "zod";

let post = {
  id: 1,
  name: "Hello World",
};

function hello({
  // Input type is what you defined in the PublicAPI below
  input,
  // Context type is inferred from the publicProcedure
  ctx,
}: PublicAPI<{
  text: string;
}>) {
  // Feel free to access other methods, they are real functions
  const latestPost = getLatestPost({
    input: undefined,
    // One ctx is passed through the whole request, it's helpful
    ctx,
  });

  return {
    greeting: `Hello ${input.text}, ${ctx.userName}! Your latest post is ${latestPost.name}`,
  };
}

async function createPost({ input }: PublicAPI<{ name: string }>) {
  post = { id: post.id + 1, name: input.name };
  // Simulate a slow db call
  await new Promise((resolve) => setTimeout(resolve, 500));
  return post;
}

function getLatestPost(
  _: // Use never to indicate that no input is required
  PublicAPI<never>,
) {
  return post;
}

export const postRouter = createTRPCRouter({
  // Just wrap the methods with the query or mutation wrapper functions, you've got a procedure now
  hello: publicQuery(hello),
  create: publicMutation(createPost, {
    // By default, input validation is not enabled
    // You can enable it by passing an inputValidator option
    inputValidator: z.object({
      name: z.string().startsWith("A"),
    }),
  }),
  getLatest: publicQuery(getLatestPost),
});

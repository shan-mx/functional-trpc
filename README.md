# Functional tRPC

This is a utility code snippet that helps you to define tRPC procedures in a functional way.

This patch will not break any existing code, but it will add a "server-action like" way to define your procedures, which makes your code more flexible and easier to test.

_Note: This patch relies on the v11 version of tRPC._

## Usage

### 1. Paste the code below into a `utils.ts` file

```typescript
// utils.ts

import type {
  AnyProcedureBuilder,
  inferProcedureBuilderResolverOptions,
  MaybePromise,
  MutationProcedure,
  QueryProcedure,
  unsetMarker,
} from "@trpc/server/unstable-core-do-not-import";

import { z } from "zod";

type ProcedureInput<Input> = Input extends typeof unsetMarker
  ? undefined
  : Input;

type ProcedureContext<Procedure extends AnyProcedureBuilder> =
  inferProcedureBuilderResolverOptions<Procedure>["ctx"];

type ProcedureFn<
  Procedure extends AnyProcedureBuilder,
  Input,
  Output,
> = (args: {
  input: ProcedureInput<Input>;
  ctx: ProcedureContext<Procedure>;
}) => MaybePromise<Output>;

interface ProcedureOptions<Input> {
  inputValidator?: z.ZodType<Input>;
}

export function getProcedureWrappers<Procedure extends AnyProcedureBuilder>(
  procedure: Procedure,
) {
  const initProcedure = <Input>({ inputValidator }: ProcedureOptions<Input>) =>
    procedure.input(inputValidator ?? z.custom<Input>());

  const query = <Input, Output>(
    fn: ProcedureFn<Procedure, Input, Output>,
    opts: ProcedureOptions<Input> = {},
  ) =>
    initProcedure<Input>(opts).query<Output>(fn) as QueryProcedure<{
      input: ProcedureInput<Input>;
      output: Output;
    }>;

  const mutation = <Input, Output>(
    fn: ProcedureFn<Procedure, Input, Output>,
    opts: ProcedureOptions<Input> = {},
  ) =>
    initProcedure<Input>(opts).mutation<Output>(fn) as MutationProcedure<{
      input: ProcedureInput<Input>;
      output: Output;
    }>;

  return {
    query,
    mutation,
  };
}

export interface DefineAPI<InputType, Procedure extends AnyProcedureBuilder> {
  input: [InputType] extends [never] ? undefined : InputType;
  ctx: ProcedureContext<Procedure>;
}
```

### 2. Use the utility function `getProcedureWrappers` to create query and mutation wrappers for your procedures

```typescript
// trpc.ts

// Most of the code below is from create-t3-app
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { type DefineAPI, getProcedureWrappers } from "./utils";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

// Example usage
export const { query: publicQuery, mutation: publicMutation } =
  getProcedureWrappers(publicProcedure);

export type PublicAPI<Input> = DefineAPI<Input, typeof publicProcedure>;
```

### 3. Use the `publicQuery` and `publicMutation` wrappers to define your functional APIs

```typescript
// routers/post.ts

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
```

### 4. Done. No need to change the client-side code

You can see the full example code in the "example" directory.

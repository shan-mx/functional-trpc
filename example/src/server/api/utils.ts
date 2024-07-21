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

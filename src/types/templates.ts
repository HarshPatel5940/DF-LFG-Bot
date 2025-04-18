import { ulid } from "ulid";
import { z } from "zod";

export const buttonSchema = z.object({
  buttonID: z
    .string()
    .ulid()
    .default(() => ulid()),
  buttonLabel: z.string().min(3).max(50),
  buttonType: z.enum(["primary", "secondary", "danger"]),
  buttonReplyContent: z.string().min(10),
});

export const templateSchema = z.object({
  id: z
    .string()
    .ulid()
    .default(() => ulid()),
  name: z.string().min(3).max(50),
  content: z.string().min(10).max(1500),
  buttonArr: z.array(buttonSchema).optional().default([]),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type ButtonSchemaType = z.infer<typeof buttonSchema>;
export type TemplateSchemaType = z.infer<typeof templateSchema>;

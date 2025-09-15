import { v4 as uuidv4 } from "uuid";

export type UUID = `${string}-${string}-${string}-${string}-${string}`;
export const newId = (): UUID => uuidv4() as UUID;


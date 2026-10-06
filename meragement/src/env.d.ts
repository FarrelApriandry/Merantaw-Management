/// <reference types="astro/client" />

declare module "*.css";
declare module "gapi-script";
declare module "imap-simple";
declare module "nodemailer";
declare module "react-big-calendar" {
  import type { ComponentType } from "react";
  export const Calendar: ComponentType<Record<string, unknown>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function dateFnsLocalizer(config: any): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Event = any;
}
declare module "react-big-calendar/lib/addons/dragAndDrop" {
  const mod: unknown;
  export default mod;
}
declare module "react-big-calendar/lib/css/react-big-calendar.css";
declare module "react-big-calendar/lib/addons/dragAndDrop/styles.css";


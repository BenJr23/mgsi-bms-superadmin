    import { auth } from "@/lib/auth"; // Your auth.ts file
    import { toNextJsHandler } from "better-auth/next-js";

    // This MUST be exported exactly like this
    export const { GET, POST } = toNextJsHandler(auth);
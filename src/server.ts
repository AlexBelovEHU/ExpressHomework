import express, { type NextFunction, type Request, type Response } from "express";

interface UserInput {
  name: string;
  age: number;
  email: string;
}

const app = express();
const API_TOKEN = process.env.SECRET;

app.use((req: Request, res: Response, next: NextFunction): void => {
  const startedAt = Date.now();

  res.on("finish", () => {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "");
    const duration = Date.now() - startedAt;
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });

  next();
});

app.use(express.json());

function authorize(req: Request, res: Response, next: NextFunction): void {
  if (req.get("Authorization") !== `Bearer ${API_TOKEN}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateUser(req: Request, res: Response, next: NextFunction): void {
  const body: unknown = req.body;
  const errors: string[] = [];

  if (!isRecord(body)) {
    res.status(400).json({ error: "Validation failed", details: ["Request body must be an object"] });
    return;
  }

  const { name, age, email } = body;
  const validName = typeof name === "string" ? name.trim() : "";
  const validAge = typeof age === "number" ? age : Number.NaN;
  const validEmail = typeof email === "string" ? email.trim() : "";

  if (validName.length < 2) {
    errors.push("name must be a string with at least 2 characters");
  }

  if (!Number.isFinite(validAge) || validAge < 0 || validAge > 120) {
    errors.push("age must be a number between 0 and 120");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validEmail)) {
    errors.push("email must be a valid email address");
  }

  if (errors.length > 0) {
    res.status(400).json({ error: "Validation failed", details: errors });
    return;
  }

  req.body = {
    name: validName,
    age: validAge,
    email: validEmail,
  } satisfies UserInput;

  next();
}

app.get("/api/data", authorize, (_req: Request, res: Response): void => {
  res.json({ message: "Protected data" });
});

app.post("/api/users", authorize, validateUser, (req: Request, res: Response): void => {
  const user = req.body as UserInput;
  res.status(201).json({ message: "User created", user });
});

app.get("/public/info", (_req: Request, res: Response): void => {
  res.json({ message: "Public information" });
});

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });
}

export { app };

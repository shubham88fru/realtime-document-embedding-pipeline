import { EMBEDDING_DIMENSIONS, createDatabaseClient, poolSizeFor } from "@/lib/db";
import { DOCUMENT_STATUSES } from "@/types/document";
import { loadEnvFiles } from "../scripts/load-env-files";

loadEnvFiles();

const DEV_USER_EMAIL = "dev@example.com";

/**
 * One document per status, so the dashboard has something to render in every
 * state without anyone having to drive a file through the real pipeline. The
 * fields that only make sense in a given state — progress, error text — are set
 * to match it, otherwise the seed would teach the UI to expect combinations the
 * pipeline never produces.
 */
const DOCUMENTS = [
  {
    fileName: "quarterly-report.pdf",
    status: "uploaded",
    progressPercentage: 0,
    errorMessage: null,
  },
  {
    fileName: "research-paper.pdf",
    status: "processing",
    progressPercentage: 45,
    errorMessage: null,
  },
  {
    fileName: "meeting-notes.pdf",
    status: "complete",
    progressPercentage: 100,
    errorMessage: null,
  },
  {
    fileName: "corrupted-scan.pdf",
    status: "error",
    progressPercentage: 30,
    errorMessage: "Could not extract text: the file is not a readable PDF.",
  },
] as const;

function assertEveryStatusIsCovered() {
  const seeded = new Set<string>(DOCUMENTS.map((document) => document.status));
  const missing = DOCUMENT_STATUSES.filter((status) => !seeded.has(status));

  if (missing.length > 0) {
    throw new Error(
      `Seed is missing a document for: ${missing.join(", ")}. ` +
        "Every status needs one so the dashboard can be checked in each state.",
    );
  }
}

async function main() {
  assertEveryStatusIsCovered();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set; nothing to seed.");
  }

  const client = createDatabaseClient({
    connectionString,
    maxConnections: poolSizeFor(1),
  });

  try {
    // Re-running the seed should leave the same rows, not pile up duplicates.
    await client.user.deleteMany({ where: { email: DEV_USER_EMAIL } });

    const user = await client.user.create({
      data: {
        email: DEV_USER_EMAIL,
        name: "Dev User",
        photoUrl: "https://avatars.githubusercontent.com/u/0",
      },
    });

    for (const document of DOCUMENTS) {
      const created = await client.document.create({
        data: {
          userId: user.id,
          fileName: document.fileName,
          status: document.status,
          progressPercentage: document.progressPercentage,
          errorMessage: document.errorMessage,
          s3Key: `seed/${user.id}/${document.fileName}`,
          fileUrl: `https://example.invalid/seed/${document.fileName}`,
        },
      });

      // Only a finished document has embeddings. `Unsupported` columns are
      // invisible to the generated client, so this has to be raw SQL.
      if (document.status !== "complete") {
        continue;
      }

      for (let chunkIndex = 0; chunkIndex < 3; chunkIndex += 1) {
        // Deterministic filler. These are not real embeddings; nothing reads
        // them for meaning, they exist so the column is exercised.
        const vector = `[${Array.from(
          { length: EMBEDDING_DIMENSIONS },
          (_, position) => (((chunkIndex + 1) * (position + 1)) % 100) / 100,
        ).join(",")}]`;

        await client.$executeRaw`
          INSERT INTO embeddings (id, document_id, chunk_index, content, vector)
          VALUES (
            gen_random_uuid(),
            ${created.id}::uuid,
            ${chunkIndex},
            ${`Chunk ${chunkIndex} of ${document.fileName}`},
            ${vector}::vector
          )
        `;
      }
    }

    console.log(`Seeded ${DOCUMENTS.length} documents for ${DEV_USER_EMAIL}.`);
  } finally {
    await client.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { EMBEDDING_DIMENSIONS } from "@/lib/db";
import { db } from "@/lib/db";
import {
  resetDatabase,
  toVectorLiteral,
  vectorOfDimension,
} from "@/test-support/database";

const client = db();

beforeEach(async () => {
  await resetDatabase(client);
});

afterAll(async () => {
  await client.$disconnect();
});

async function createUser(email = "reader@example.com") {
  return client.user.create({ data: { email, name: "Test Reader" } });
}

async function createDocument(userId: string, s3Key = "uploads/one.pdf") {
  return client.document.create({
    data: { userId, fileName: "one.pdf", s3Key },
  });
}

async function insertEmbedding(
  documentId: string,
  chunkIndex: number,
  vector: number[] = vectorOfDimension(EMBEDDING_DIMENSIONS),
) {
  await client.$executeRaw`
    INSERT INTO embeddings (id, document_id, chunk_index, content, vector)
    VALUES (gen_random_uuid(), ${documentId}::uuid, ${chunkIndex}, ${"chunk text"}, ${toVectorLiteral(vector)}::vector)
  `;
}

describe("users", () => {
  it("rejects a second account for the same email", async () => {
    await createUser("duplicate@example.com");

    await expect(createUser("duplicate@example.com")).rejects.toThrowError(
      /Unique constraint/i,
    );
  });

  it("stamps createdAt and updatedAt without the caller supplying them", async () => {
    const user = await createUser();

    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });
});

describe("documents", () => {
  it("starts life as uploaded with zero progress", async () => {
    const user = await createUser();

    const document = await createDocument(user.id);

    expect(document.status).toBe("uploaded");
    expect(document.progressPercentage).toBe(0);
    expect(document.errorMessage).toBeNull();
  });

  it("accepts the bounds of the progress range", async () => {
    const user = await createUser();
    const document = await createDocument(user.id);

    for (const progressPercentage of [0, 50, 100]) {
      const updated = await client.document.update({
        where: { id: document.id },
        data: { progressPercentage },
      });
      expect(updated.progressPercentage).toBe(progressPercentage);
    }
  });

  it.each([-1, 101])("rejects progress of %i", async (progressPercentage) => {
    const user = await createUser();
    const document = await createDocument(user.id);

    await expect(
      client.document.update({
        where: { id: document.id },
        data: { progressPercentage },
      }),
    ).rejects.toThrowError(/documents_progress_percentage_range/);
  });

  it("rejects a status outside the enum", async () => {
    const user = await createUser();
    const document = await createDocument(user.id);

    await expect(
      client.$executeRaw`
        UPDATE documents
        SET status = ${"halfway"}::document_status
        WHERE id = ${document.id}::uuid
      `,
    ).rejects.toThrowError(/invalid input value for enum/i);
  });

  it("rejects two documents claiming the same S3 object", async () => {
    const user = await createUser();
    await createDocument(user.id, "uploads/same.pdf");

    await expect(
      createDocument(user.id, "uploads/same.pdf"),
    ).rejects.toThrowError(/Unique constraint/i);
  });

  it("refuses to attach a document to a user that does not exist", async () => {
    await expect(
      createDocument("00000000-0000-0000-0000-000000000000"),
    ).rejects.toThrowError(/Foreign key constraint/i);
  });
});

describe("embeddings", () => {
  it("stores and returns a vector of the declared dimension", async () => {
    const user = await createUser();
    const document = await createDocument(user.id);
    const vector = vectorOfDimension(EMBEDDING_DIMENSIONS, 0.25);

    await insertEmbedding(document.id, 0, vector);

    const [row] = await client.$queryRaw<
      { dimensions: number; values: number[] }[]
    >`
      SELECT vector_dims(vector) AS dimensions, vector::real[] AS values
      FROM embeddings
      WHERE document_id = ${document.id}::uuid
    `;

    expect(row.dimensions).toBe(EMBEDDING_DIMENSIONS);
    expect(row.values).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(row.values[0]).toBeCloseTo(0.25, 5);
    expect(row.values.at(-1)).toBeCloseTo(0.25, 5);
  });

  it("rejects a vector of the wrong dimension", async () => {
    const user = await createUser();
    const document = await createDocument(user.id);

    await expect(
      insertEmbedding(document.id, 0, vectorOfDimension(3)),
    ).rejects.toThrowError(/expected 1536 dimensions/i);
  });

  it("rejects the same chunk written twice for one document", async () => {
    const user = await createUser();
    const document = await createDocument(user.id);
    await insertEmbedding(document.id, 0);

    await expect(insertEmbedding(document.id, 0)).rejects.toThrowError(
      /duplicate key value|unique constraint/i,
    );
  });

  it("allows the same chunk index across different documents", async () => {
    const user = await createUser();
    const first = await createDocument(user.id, "uploads/first.pdf");
    const second = await createDocument(user.id, "uploads/second.pdf");

    await insertEmbedding(first.id, 0);
    await insertEmbedding(second.id, 0);

    expect(await client.embedding.count()).toBe(2);
  });
});

describe("cascading deletes", () => {
  it("removes a document's embeddings with the document", async () => {
    const user = await createUser();
    const document = await createDocument(user.id);
    await insertEmbedding(document.id, 0);

    await client.document.delete({ where: { id: document.id } });

    expect(await client.embedding.count()).toBe(0);
  });

  it("removes documents and embeddings when the owner is deleted", async () => {
    const user = await createUser();
    const document = await createDocument(user.id);
    await insertEmbedding(document.id, 0);

    await client.user.delete({ where: { id: user.id } });

    expect(await client.document.count()).toBe(0);
    expect(await client.embedding.count()).toBe(0);
  });
});

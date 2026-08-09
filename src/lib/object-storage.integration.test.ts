import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { afterAll, describe, expect, it } from "vitest";

import {
  createS3ObjectStorage,
  ObjectAlreadyExistsError,
} from "./object-storage";

const config = {
  region: "us-east-1",
  bucketName: "document-embedding-pipeline-test",
  endpoint: "http://localhost:9000",
  forcePathStyle: true,
  credentials: {
    accessKeyId: "depminio",
    secretAccessKey: "dep_local_storage",
  },
};

const client = new S3Client({
  region: config.region,
  endpoint: config.endpoint,
  forcePathStyle: config.forcePathStyle,
  credentials: config.credentials,
});
const storage = createS3ObjectStorage(config);

afterAll(() => {
  client.destroy();
  storage.destroy();
});

describe("S3 object storage", () => {
  it("stores and deletes the exact private PDF object", async () => {
    const key = `integration/${crypto.randomUUID()}.pdf`;
    const bytes = new TextEncoder().encode("%PDF-1.7\nintegration");

    const storedObject = await storage.putPdf({ key, bytes });

    const object = await client.send(
      new GetObjectCommand({ Bucket: config.bucketName, Key: key }),
    );
    expect(await object.Body?.transformToByteArray()).toEqual(bytes);
    expect(object.ContentType).toBe("application/pdf");
    expect(await storage.findPdf({ key, bytes })).toEqual(storedObject);

    await expect(storage.putPdf({ key, bytes })).rejects.toBeInstanceOf(
      ObjectAlreadyExistsError,
    );

    expect(storedObject.versionId).toBeTruthy();
    await storage.deleteObject({
      key,
      versionId: storedObject.versionId,
    });

    await expect(
      client.send(
        new HeadObjectCommand({ Bucket: config.bucketName, Key: key }),
      ),
    ).rejects.toMatchObject({ $metadata: { httpStatusCode: 404 } });
  });
});

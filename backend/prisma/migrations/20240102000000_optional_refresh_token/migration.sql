-- AlterTable: torna refreshToken opcional para suportar logins sem prompt:consent
ALTER TABLE "google_tokens" ALTER COLUMN "refreshToken" DROP NOT NULL;

// Child process for the hard-kill durability test: performs one acknowledged write, reports it, then
// idles until the parent terminates it without warning. Not a test file itself.
const [dataDir, marker] = process.argv.slice(2);
process.env.AICTE_DATA_DIR = dataDir;

async function main(): Promise<void> {
  const store = await import("../../src/store/database");
  await store.mutateDatabase((db) => {
    db.applications[0]!.updatedAt = marker!;
  });
  process.stdout.write("ACK\n");
  setInterval(() => undefined, 1_000);
}

main().catch((error) => {
  process.stderr.write(String(error));
  process.exit(1);
});

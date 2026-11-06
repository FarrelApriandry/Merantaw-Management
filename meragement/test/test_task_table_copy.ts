import assert from "node:assert/strict";
import {
  formatTaskStatus,
  formatTaskDueDate,
  resolveAssigneeNames,
  formatCategories,
  taskToCopyItem,
  generateMarkdownTable,
  generateHtmlTable,
  generateTextList,
  generateCsv,
  type TaskCopyItem,
} from "../src/lib/task-table-copy";
import type { AppUser, Task } from "../src/lib/types";

console.log("🧪 Running unit tests for task-table-copy...");

// 1. Status formatting
assert.equal(formatTaskStatus("done"), "Done");
assert.equal(formatTaskStatus("in_progress"), "In Progress");
assert.equal(formatTaskStatus("todo"), "To Do");
assert.equal(formatTaskStatus("draft"), "Draft");
assert.equal(formatTaskStatus(undefined), "-");
console.log("  ✓ Status formatting passed");

// 2. Due date formatting
const sampleDate = new Date("2026-10-25T12:00:00Z");
const formattedDate = formatTaskDueDate(sampleDate);
assert.ok(formattedDate.includes("2026"), `Expected date string to contain year 2026: ${formattedDate}`);
assert.equal(formatTaskDueDate(null), "-");
assert.equal(formatTaskDueDate(undefined), "-");
// Firestore timestamp style { seconds: ... }
const firestoreTimestamp = { seconds: Math.floor(sampleDate.getTime() / 1000) };
assert.ok(formatTaskDueDate(firestoreTimestamp).includes("2026"));
console.log("  ✓ Due date formatting passed");

// 3. Assignee name resolution
const mockMembers: AppUser[] = [
  { id: "usr_1", name: "Budi Santoso", email: "budi@example.com", role: "member" },
  { id: "usr_2", name: "", email: "siti@example.com", role: "member" },
];
assert.equal(resolveAssigneeNames("usr_1", mockMembers), "Budi Santoso");
assert.equal(resolveAssigneeNames("usr_2", mockMembers), "siti@example.com");
assert.equal(resolveAssigneeNames(["usr_1", "usr_2"], mockMembers), "Budi Santoso, siti@example.com");
assert.equal(resolveAssigneeNames("usr_unknown", mockMembers), "usr_unknown");
assert.equal(resolveAssigneeNames(undefined, mockMembers), "-");
assert.equal(resolveAssigneeNames([], mockMembers), "-");
console.log("  ✓ Assignee resolution passed");

// 4. Categories formatting
assert.equal(formatCategories(["Frontend", "UI"]), "Frontend, UI");
assert.equal(formatCategories([]), "-");
assert.equal(formatCategories(undefined), "-");
console.log("  ✓ Categories formatting passed");

// 5. Task to Copy Item
const mockTask: Task = {
  id: "task_1",
  title: "Setup Vitest & Tests",
  status: "in_progress",
  assignedTo: ["usr_1"],
  dueDate: sampleDate,
  category: ["DevOps", "Testing"],
  link: "https://example.com/pr/1",
};

const copyItem = taskToCopyItem(mockTask, 1, mockMembers, "Sprint 1");
assert.equal(copyItem.index, 1);
assert.equal(copyItem.title, "Setup Vitest & Tests");
assert.equal(copyItem.status, "In Progress");
assert.equal(copyItem.assignees, "Budi Santoso");
assert.equal(copyItem.category, "DevOps, Testing");
assert.equal(copyItem.link, "https://example.com/pr/1");
assert.equal(copyItem.listName, "Sprint 1");
console.log("  ✓ taskToCopyItem passed");

// 6. Markdown Table Generation with aligned padding
const items: TaskCopyItem[] = [
  copyItem,
  {
    index: 2,
    id: "task_2",
    title: "Simple Task",
    status: "To Do",
    rawStatus: "todo",
    assignees: "-",
    dueDate: "-",
    category: "-",
    link: "-",
    listName: "Sprint 1",
  },
];

const mdTable = generateMarkdownTable(items);
assert.ok(mdTable.includes("| No | Task"));
assert.ok(mdTable.includes("| 1  | Setup Vitest & Tests"));
assert.ok(mdTable.includes("| 2  | Simple Task"));
assert.ok(!mdTable.includes("Link"));
assert.ok(!mdTable.includes("https://example.com/pr/1"));

// Verify all lines in the markdown table have the same number of pipes
const lines = mdTable.split("\n");
const pipeCount = (lines[0].match(/\|/g) || []).length;
for (const line of lines) {
  assert.equal((line.match(/\|/g) || []).length, pipeCount, `Mismatched pipe count in line: ${line}`);
}
console.log("  ✓ Markdown table generated without link column");

// 7. Markdown with List column
const mdTableWithList = generateMarkdownTable(items, { includeList: true });
assert.ok(/\|\s*List\s*\|/.test(mdTableWithList));
assert.ok(mdTableWithList.includes("Sprint 1"));
assert.ok(!mdTableWithList.includes("Link"));
console.log("  ✓ Markdown table with list column passed");

// 8. HTML Table Generation
const htmlTable = generateHtmlTable(items);
assert.ok(htmlTable.startsWith("<table"));
assert.ok(htmlTable.endsWith("</table>"));
assert.ok(htmlTable.includes("<th"));
assert.ok(htmlTable.includes("Setup Vitest &amp; Tests"));
assert.ok(!htmlTable.includes(">Link</th>"));
assert.ok(!htmlTable.includes('href="https://example.com/pr/1"'));
console.log("  ✓ HTML table generated without link column");

// 9. Text List Generation
const textList = generateTextList(items, { projectName: "Project Merantaw", listName: "Sprint 1" });
assert.ok(textList.includes("📋 DAFTAR TASK: Project Merantaw"));
assert.ok(textList.includes("📁 List: Sprint 1 (Total: 2 task)"));
assert.ok(textList.includes("1. Setup Vitest & Tests"));
assert.ok(textList.includes("• Status   : In Progress"));
assert.ok(textList.includes("• Assignee : Budi Santoso"));
assert.ok(!textList.includes("• Link"));
assert.ok(textList.includes("2. Simple Task"));
console.log("  ✓ Text list format passed");

// 10. CSV Generation
const csv = generateCsv(items);
const csvLines = csv.split("\n");
assert.equal(csvLines[0], "No,Task,Status,Assignee,Tenggat,Kategori");
assert.ok(csvLines[1].startsWith("1,Setup Vitest & Tests,In Progress,Budi Santoso,"));
assert.ok(!csvLines[0].includes("Link"));
console.log("  ✓ CSV generation without link column passed");

console.log("\n🎉 ALL UNIT TESTS PASSED SUCCESSFULLY!");

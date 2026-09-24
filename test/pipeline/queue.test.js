import { test } from "node:test";
import assert from "node:assert/strict";
import { createQueue } from "../../src/pipeline/queue.js";

test("dequeue returns items in the order they were enqueued", () => {
  const queue = createQueue({ maxSize: 20 });
  queue.enqueue("first");
  queue.enqueue("second");

  assert.equal(queue.dequeue(), "first");
  assert.equal(queue.dequeue(), "second");
});

test("dropping the oldest item when enqueueing past maxSize", () => {
  const queue = createQueue({ maxSize: 2 });
  queue.enqueue("first");
  queue.enqueue("second");
  queue.enqueue("third");

  assert.equal(queue.size, 2);
  assert.equal(queue.dequeue(), "second");
  assert.equal(queue.dequeue(), "third");
});

test("size reflects the current number of queued items", () => {
  const queue = createQueue({ maxSize: 20 });
  assert.equal(queue.size, 0);
  queue.enqueue("first");
  assert.equal(queue.size, 1);
  queue.dequeue();
  assert.equal(queue.size, 0);
});

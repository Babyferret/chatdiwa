export function createQueue({ maxSize }) {
  const items = [];

  return {
    enqueue(item) {
      items.push(item);
      if (items.length > maxSize) {
        items.shift();
      }
    },
    dequeue() {
      return items.shift();
    },
    get size() {
      return items.length;
    },
  };
}

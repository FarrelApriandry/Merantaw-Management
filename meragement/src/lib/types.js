/**
 * @typedef {Object} List
 * @property {string} id
 * @property {string} name
 * @property {string} icon - Lucide icon name
 * @property {number} order - Sort position
 * @property {string} color - Hex or tailwind color
 * @property {import('firebase/firestore').Timestamp} [createdAt]
 * @property {import('firebase/firestore').Timestamp} [updatedAt]
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} listId - Parent list ID
 * @property {string} title
 * @property {string} status - draft | todo | in_progress | done
 * @property {string[]} [category]
 * @property {string|string[]} [assignedTo]
 * @property {Date|import('firebase/firestore').Timestamp} [dueDate]
 * @property {string} [link]
 * @property {import('firebase/firestore').Timestamp} [createdAt]
 * @property {import('firebase/firestore').Timestamp} [updatedAt]
 */

export {};

/**
 * Manual mock for wx-server-sdk (WeChat Cloud server SDK)
 * For use via jest.mock('wx-server-sdk') in test files.
 * jest.fn() is available in __mocks__ files.
 */

const mockCollection = jest.fn()
const mockWhere = jest.fn()
const mockDoc = jest.fn()
const mockAdd = jest.fn()
const mockGet = jest.fn()
const mockUpdate = jest.fn()
const mockRemove = jest.fn()
const mockCount = jest.fn()
const mockOrderBy = jest.fn()
const mockSkip = jest.fn()
const mockLimit = jest.fn()
const mockField = jest.fn()

// Build chain: collection → where → get/count, collection → doc → get/update/remove
mockWhere.mockReturnValue({
  get: mockGet,
  count: mockCount,
  orderBy: mockOrderBy,
  skip: mockSkip,
  limit: mockLimit,
  field: mockField,
  where: jest.fn().mockReturnThis(),
})

mockDoc.mockReturnValue({
  get: mockGet,
  update: mockUpdate,
  remove: mockRemove,
  field: mockField,
})

mockCollection.mockReturnValue({
  add: mockAdd,
  where: mockWhere,
  doc: mockDoc,
  orderBy: mockOrderBy,
  skip: mockSkip,
  limit: mockLimit,
  field: mockField,
  get: mockGet,
  count: mockCount,
})

const mockDb = {
  collection: mockCollection,
  command: {
    eq: jest.fn((v) => v),
    neq: jest.fn((v) => v),
    gt: jest.fn((v) => v),
    gte: jest.fn((v) => v),
    lt: jest.fn((v) => v),
    lte: jest.fn((v) => v),
    and: jest.fn(),
    or: jest.fn(),
  },
  serverDate: jest.fn(() => new Date()),
}

const mock = {
  init: jest.fn(),
  database: jest.fn(() => mockDb),
  getWXContext: jest.fn(() => ({ OPENID: 'test-openid' })),
  serverDate: jest.fn(() => new Date()),
  command: mockDb.command,
  // Expose internal mocks for test assertions
  __mockDb: mockDb,
  __mockCollection: mockCollection,
  __mockWhere: mockWhere,
  __mockDoc: mockDoc,
  __mockAdd: mockAdd,
  __mockGet: mockGet,
  __mockUpdate: mockUpdate,
  __mockRemove: mockRemove,
  __mockCount: mockCount,
}

module.exports = mock

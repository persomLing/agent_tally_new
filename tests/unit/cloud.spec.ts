import { callCloudFunction, callFunctionWithData, __registerMock, __clearMocks } from '@/services/cloud'

describe('cloud service', () => {
  afterEach(() => {
    __clearMocks()
  })

  describe('callCloudFunction', () => {
    it('returns success result from mock', async () => {
      __registerMock('testFn', () => ({ success: true, data: { id: '123' } }))
      const result = await callCloudFunction('testFn', { foo: 'bar' })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ id: '123' })
    })

    it('returns error result from mock', async () => {
      __registerMock('testFn', () => ({
        success: false,
        errorCode: 'SERVICE_ERROR',
        message: 'Something went wrong',
      }))
      const result = await callCloudFunction('testFn')
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('SERVICE_ERROR')
    })

    it('handles exceptions in mock', async () => {
      __registerMock('testFn', () => { throw new Error('oops') })
      const result = await callCloudFunction('testFn')
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('SERVICE_ERROR')
    })
  })

  describe('callFunctionWithData', () => {
    it('unwraps data on success', async () => {
      __registerMock('testFn', () => ({ success: true, data: 'hello' }))
      const data = await callFunctionWithData<string>('testFn')
      expect(data).toBe('hello')
    })

    it('throws on failure', async () => {
      __registerMock('testFn', () => ({ success: false, errorCode: 'ERROR', message: 'fail' }))
      await expect(callFunctionWithData('testFn')).rejects.toThrow('fail')
    })
  })

  describe('__registerMock / __clearMocks', () => {
    it('clears mocks between tests', async () => {
      __registerMock('testFn', () => ({ success: true, data: 'val' }))
      __clearMocks()
      const result = await callCloudFunction('testFn')
      expect(result.success).toBe(false)
    })
  })
})

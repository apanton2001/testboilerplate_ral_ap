const classificationService = require('../../src/services/classificationService');
const db = require('../../src/config/database');

// Mock the database
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

describe('Classification Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getClassificationByHsCode', () => {
    it('should return classification data when HS code exists', async () => {
      // Mock data
      const mockHsCode = '8471.30.01';
      const mockClassificationData = {
        id: 1,
        hs_code: mockHsCode,
        description: 'Portable automatic data processing machines',
        duty_rate: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Setup mock response
      db.query.mockResolvedValue({
        rows: [mockClassificationData],
        rowCount: 1,
      });

      // Execute the function
      const result = await classificationService.getClassificationByHsCode(mockHsCode);

      // Assertions
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM classifications'),
        [mockHsCode]
      );
      expect(result).toEqual(mockClassificationData);
    });

    it('should return null when HS code does not exist', async () => {
      // Mock data
      const mockHsCode = '9999.99.99';

      // Setup mock response
      db.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      // Execute the function
      const result = await classificationService.getClassificationByHsCode(mockHsCode);

      // Assertions
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should throw an error when database query fails', async () => {
      // Mock data
      const mockHsCode = '8471.30.01';
      const mockError = new Error('Database connection error');

      // Setup mock response
      db.query.mockRejectedValue(mockError);

      // Execute and assert
      await expect(classificationService.getClassificationByHsCode(mockHsCode))
        .rejects
        .toThrow('Error fetching classification data');
    });
  });

  describe('classifyProduct', () => {
    it('should classify a product based on description', async () => {
      // Mock data
      const mockProductDescription = 'Laptop computer with Intel i7 processor';
      const mockClassificationResult = {
        hs_code: '8471.30.01',
        confidence: 0.95,
        description: 'Portable automatic data processing machines',
      };

      // Setup mock response for AI classification
      jest.spyOn(classificationService, 'callClassificationAPI').mockResolvedValue(mockClassificationResult);

      // Execute the function
      const result = await classificationService.classifyProduct(mockProductDescription);

      // Assertions
      expect(classificationService.callClassificationAPI).toHaveBeenCalledTimes(1);
      expect(classificationService.callClassificationAPI).toHaveBeenCalledWith(mockProductDescription);
      expect(result).toEqual(mockClassificationResult);
    });

    it('should handle errors during classification', async () => {
      // Mock data
      const mockProductDescription = 'Invalid product description';
      const mockError = new Error('Classification API error');

      // Setup mock response
      jest.spyOn(classificationService, 'callClassificationAPI').mockRejectedValue(mockError);

      // Execute and assert
      await expect(classificationService.classifyProduct(mockProductDescription))
        .rejects
        .toThrow('Error classifying product');
    });
  });
});
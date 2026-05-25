// Tests for data loader module
const {
  getInternByPhone,
  getDestination,
  searchFAQs,
  getAllInterns,
  getAllDestinations,
  getFAQsByDestination,
  reloadData
} = require('../../lib/data-loader');

describe('Data Loader', () => {
  describe('getInternByPhone', () => {
    test('should find intern by phone number', () => {
      const intern = getInternByPhone('+911234567890');
      expect(intern).toBeDefined();
      expect(intern.name).toBe('Rahul Sharma');
      expect(intern.id).toBe('intern_001');
    });

    test('should return null for unknown phone', () => {
      const intern = getInternByPhone('+99999999999');
      expect(intern).toBeNull();
    });

    test('should handle whatsapp prefix in phone', () => {
      const intern = getInternByPhone('whatsapp:+911234567890');
      expect(intern).toBeDefined();
      expect(intern.name).toBe('Rahul Sharma');
    });

    test('should handle phone without whatsapp prefix', () => {
      const intern = getInternByPhone('+911234567890');
      expect(intern).toBeDefined();
      expect(intern.name).toBe('Rahul Sharma');
    });
  });

  describe('getDestination', () => {
    test('should find destination by id', () => {
      const destination = getDestination('bangalore');
      expect(destination).toBeDefined();
      expect(destination.name).toBe('Bangalore, Karnataka');
      expect(destination.id).toBe('bangalore');
    });

    test('should return null for unknown destination', () => {
      const destination = getDestination('unknown_city');
      expect(destination).toBeNull();
    });

    test('should have coordinator info', () => {
      const destination = getDestination('bangalore');
      expect(destination.coordinator).toBeDefined();
      expect(destination.coordinator.name).toBeDefined();
      expect(destination.coordinator.phone).toBeDefined();
    });

    test('should have accommodation info', () => {
      const destination = getDestination('bangalore');
      expect(destination.accommodation).toBeDefined();
      expect(destination.accommodation.name).toBeDefined();
      expect(destination.accommodation.address).toBeDefined();
    });
  });

  describe('searchFAQs', () => {
    test('should find FAQ by keyword match', () => {
      const faq = searchFAQs('bangalore', 'grocery');
      expect(faq).toBeDefined();
      expect(faq.destination_id).toBe('bangalore');
    });

    test('should find FAQ with case-insensitive search', () => {
      const faq = searchFAQs('bangalore', 'GROCERY');
      expect(faq).toBeDefined();
    });

    test('should find FAQ by partial keyword', () => {
      const faq = searchFAQs('bangalore', 'buy groceries');
      expect(faq).toBeDefined();
      expect(faq.keywords).toContain('grocery');
    });

    test('should return null when no FAQ matches', () => {
      const faq = searchFAQs('bangalore', 'nonexistent_keyword_xyz');
      expect(faq).toBeNull();
    });

    test('should only search within destination', () => {
      const faq = searchFAQs('pune', 'grocery');
      // Pune should have its own FAQ or might not have this specific one
      if (faq) {
        expect(faq.destination_id).toBe('pune');
      }
    });
  });

  describe('getAllInterns', () => {
    test('should return array of interns', () => {
      const interns = getAllInterns();
      expect(Array.isArray(interns)).toBe(true);
      expect(interns.length).toBeGreaterThan(0);
    });

    test('should have required fields on each intern', () => {
      const interns = getAllInterns();
      interns.forEach(intern => {
        expect(intern.id).toBeDefined();
        expect(intern.name).toBeDefined();
        expect(intern.phone).toBeDefined();
        expect(intern.destination_id).toBeDefined();
      });
    });
  });

  describe('getAllDestinations', () => {
    test('should return array of destinations', () => {
      const destinations = getAllDestinations();
      expect(Array.isArray(destinations)).toBe(true);
      expect(destinations.length).toBeGreaterThan(0);
    });

    test('should have at least 3 destinations', () => {
      const destinations = getAllDestinations();
      expect(destinations.length).toBeGreaterThanOrEqual(3);
    });

    test('should have required fields on each destination', () => {
      const destinations = getAllDestinations();
      destinations.forEach(destination => {
        expect(destination.id).toBeDefined();
        expect(destination.name).toBeDefined();
        expect(destination.coordinator).toBeDefined();
        expect(destination.accommodation).toBeDefined();
      });
    });
  });

  describe('getFAQsByDestination', () => {
    test('should return FAQs for specific destination', () => {
      const faqs = getFAQsByDestination('bangalore');
      expect(Array.isArray(faqs)).toBe(true);
      expect(faqs.length).toBeGreaterThan(0);
    });

    test('should only return FAQs for specified destination', () => {
      const faqs = getFAQsByDestination('bangalore');
      faqs.forEach(faq => {
        expect(faq.destination_id).toBe('bangalore');
      });
    });

    test('should return empty array for unknown destination', () => {
      const faqs = getFAQsByDestination('unknown_city');
      expect(Array.isArray(faqs)).toBe(true);
      expect(faqs.length).toBe(0);
    });
  });

  describe('reloadData', () => {
    test('should clear cache', () => {
      const interns1 = getAllInterns();
      reloadData();
      const interns2 = getAllInterns();
      // Should have same data but reloaded
      expect(interns1.length).toBe(interns2.length);
    });
  });
});

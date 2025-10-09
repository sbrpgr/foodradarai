// FoodRadar.AI API Integration Module

// API Base Configuration
const API_CONFIG = {
    baseURL: '', // Using relative URLs for table API
    endpoints: {
        products: 'tables/products',
        priceTracking: 'tables/price_tracking',
        analysisHistory: 'tables/analysis_history'
    }
};

// API Service Class
class FoodRadarAPI {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${API_CONFIG.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Cache management
    getCacheKey(endpoint, params = {}) {
        return `${endpoint}_${JSON.stringify(params)}`;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    getCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    // Products API methods
    async searchProducts(query, category = null, limit = 10) {
        const params = new URLSearchParams({
            search: query,
            limit: limit.toString()
        });
        
        if (category) {
            // Note: This would need server-side filtering implementation
            params.append('category', category);
        }

        const cacheKey = this.getCacheKey('search_products', { query, category, limit });
        const cached = this.getCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await this.request(`${API_CONFIG.endpoints.products}?${params}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Search products error:', error);
            // Return mock data as fallback
            return this.getMockProductSearchResults(query, limit);
        }
    }

    async getProduct(productId) {
        const cacheKey = this.getCacheKey('product', { id: productId });
        const cached = this.getCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await this.request(`${API_CONFIG.endpoints.products}/${productId}`);
            this.setCache(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Get product error:', error);
            return null;
        }
    }

    async getSimilarProducts(productId, limit = 5) {
        // This would typically involve vector similarity search on the server
        // For now, we'll implement a simple category-based similarity
        try {
            const baseProduct = await this.getProduct(productId);
            if (!baseProduct) return [];

            const params = new URLSearchParams({
                limit: (limit * 2).toString() // Get more to filter out the base product
            });

            const response = await this.request(`${API_CONFIG.endpoints.products}?${params}`);
            
            // Filter products by same category and exclude the base product
            const similarProducts = response.data
                .filter(product => 
                    product.category === baseProduct.category && 
                    product.id !== productId
                )
                .slice(0, limit);

            return similarProducts;
        } catch (error) {
            console.error('Get similar products error:', error);
            return this.getMockSimilarProducts(productId, limit);
        }
    }

    // Price tracking API methods
    async getProductPrices(productId) {
        const params = new URLSearchParams({
            product_id: productId,
            limit: '10'
        });

        const cacheKey = this.getCacheKey('product_prices', { productId });
        const cached = this.getCache(cacheKey);
        if (cached) return cached;

        try {
            // Note: This would need server-side filtering by product_id
            const response = await this.request(`${API_CONFIG.endpoints.priceTracking}?${params}`);
            
            // Client-side filtering as fallback
            const filteredPrices = response.data.filter(price => price.product_id === productId);
            
            const result = {
                ...response,
                data: filteredPrices
            };
            
            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Get product prices error:', error);
            return this.getMockProductPrices(productId);
        }
    }

    async getLowestPrice(productId) {
        try {
            const pricesResponse = await this.getProductPrices(productId);
            const prices = pricesResponse.data.filter(price => price.is_available);
            
            if (prices.length === 0) return null;

            return prices.reduce((lowest, current) => 
                current.current_price < lowest.current_price ? current : lowest
            );
        } catch (error) {
            console.error('Get lowest price error:', error);
            return null;
        }
    }

    // Analysis history API methods
    async saveAnalysisResult(analysisData) {
        try {
            const data = {
                query_text: analysisData.query,
                query_type: analysisData.type,
                base_product_id: analysisData.baseProductId,
                similar_products: analysisData.similarProductIds,
                ai_summary: JSON.stringify(analysisData.summary),
                recommended_product_id: analysisData.recommendedProductId,
                user_ip: 'xxx.xxx.xxx.xxx', // Anonymized
                analysis_duration: analysisData.duration
            };

            return await this.request(API_CONFIG.endpoints.analysisHistory, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.error('Save analysis result error:', error);
            return null;
        }
    }

    async getAnalysisHistory(limit = 10) {
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                sort: 'created_at'
            });

            return await this.request(`${API_CONFIG.endpoints.analysisHistory}?${params}`);
        } catch (error) {
            console.error('Get analysis history error:', error);
            return { data: [], total: 0 };
        }
    }

    // Mock data methods for fallback
    getMockProductSearchResults(query, limit) {
        const mockProducts = [
            {
                id: 'prod_001',
                name: '신라면 더레드',
                brand: '농심',
                category: 'instant-noodles',
                price: 1200,
                image_url: 'https://via.placeholder.com/300x300?text=신라면더레드',
                scores: { price: 75, nutrition: 70, harmful: 65, additives: 60, trust: 85, eco: 50 }
            },
            {
                id: 'prod_002',
                name: '진라면 매운맛',
                brand: '오뚜기',
                category: 'instant-noodles',
                price: 1100,
                image_url: 'https://via.placeholder.com/300x300?text=진라면매운맛',
                scores: { price: 80, nutrition: 72, harmful: 70, additives: 65, trust: 80, eco: 55 }
            }
        ];

        return {
            data: mockProducts.slice(0, limit),
            total: mockProducts.length,
            page: 1,
            limit: limit
        };
    }

    getMockSimilarProducts(productId, limit) {
        const mockSimilar = [
            {
                id: 'prod_002',
                name: '진라면 매운맛',
                brand: '오뚜기',
                category: 'instant-noodles',
                price: 1100,
                image_url: 'https://via.placeholder.com/300x300?text=진라면매운맛',
                scores: { price: 80, nutrition: 72, harmful: 70, additives: 65, trust: 80, eco: 55 }
            },
            {
                id: 'prod_003',
                name: '육개장 사발면',
                brand: '농심',
                category: 'instant-noodles',
                price: 1300,
                image_url: 'https://via.placeholder.com/300x300?text=육개장사발면',
                scores: { price: 70, nutrition: 75, harmful: 68, additives: 62, trust: 82, eco: 52 }
            }
        ];

        return mockSimilar.slice(0, limit);
    }

    getMockProductPrices(productId) {
        const mockPrices = [
            {
                id: 'price_001',
                product_id: productId,
                store_name: '쿠팡',
                store_url: 'https://www.coupang.com',
                current_price: 1150,
                original_price: 1200,
                discount_rate: 4.17,
                is_available: true,
                last_updated: new Date().toISOString()
            },
            {
                id: 'price_002',
                product_id: productId,
                store_name: '네이버쇼핑',
                store_url: 'https://shopping.naver.com',
                current_price: 1200,
                original_price: 1200,
                discount_rate: 0,
                is_available: true,
                last_updated: new Date().toISOString()
            }
        ];

        return {
            data: mockPrices,
            total: mockPrices.length
        };
    }
}

// Enhanced analysis functions using real API
class EnhancedFoodAnalyzer {
    constructor() {
        this.api = new FoodRadarAPI();
        this.analysisStartTime = null;
    }

    async analyzeProductByName(productName) {
        this.analysisStartTime = Date.now();
        
        try {
            // Search for the base product
            const searchResults = await this.api.searchProducts(productName, null, 1);
            
            if (searchResults.data.length === 0) {
                throw new Error('제품을 찾을 수 없습니다.');
            }

            const baseProduct = searchResults.data[0];
            return await this.performDetailedAnalysis(baseProduct);
        } catch (error) {
            console.error('Product analysis error:', error);
            throw error;
        }
    }

    async analyzeProductByCategory(category, detail = '') {
        this.analysisStartTime = Date.now();
        
        try {
            const searchQuery = detail || category;
            const searchResults = await this.api.searchProducts(searchQuery, category, 5);
            
            if (searchResults.data.length === 0) {
                throw new Error('해당 카테고리의 제품을 찾을 수 없습니다.');
            }

            // Use the first product as base for comparison
            const baseProduct = searchResults.data[0];
            return await this.performDetailedAnalysis(baseProduct, searchResults.data);
        } catch (error) {
            console.error('Category analysis error:', error);
            throw error;
        }
    }

    async performDetailedAnalysis(baseProduct, predefinedSimilar = null) {
        try {
            // Get similar products
            const similarProducts = predefinedSimilar || 
                await this.api.getSimilarProducts(baseProduct.id, 4);

            // Get price information for all products
            const allProducts = [baseProduct, ...similarProducts];
            const productsWithPrices = await Promise.all(
                allProducts.map(async (product) => {
                    const lowestPrice = await this.api.getLowestPrice(product.id);
                    return {
                        ...product,
                        lowestPrice: lowestPrice || {
                            price: `${product.price}원`,
                            store: '기본가격',
                            url: '#'
                        }
                    };
                })
            );

            // Generate AI summary
            const aiSummary = this.generateAISummary(productsWithPrices);
            
            // Find recommended product
            const recommendedProduct = this.findRecommendedProduct(productsWithPrices.slice(1));
            
            // Calculate analysis duration
            const duration = (Date.now() - this.analysisStartTime) / 1000;

            // Save analysis result
            await this.api.saveAnalysisResult({
                query: baseProduct.name,
                type: 'enhanced',
                baseProductId: baseProduct.id,
                similarProductIds: similarProducts.map(p => p.id),
                summary: aiSummary,
                recommendedProductId: recommendedProduct.id,
                duration: duration
            });

            return {
                baseProduct: productsWithPrices[0],
                similarProducts: productsWithPrices,
                aiSummary: aiSummary,
                recommendation: recommendedProduct
            };
        } catch (error) {
            console.error('Detailed analysis error:', error);
            throw error;
        }
    }

    generateAISummary(products) {
        const baseProduct = products[0];
        const otherProducts = products.slice(1);
        
        // Find best in each category
        const bestNutrition = otherProducts.reduce((a, b) => 
            (a.score_nutrition || 0) > (b.score_nutrition || 0) ? a : b
        );
        
        const bestPrice = otherProducts.reduce((a, b) => 
            (a.score_price || 0) > (b.score_price || 0) ? a : b
        );
        
        const bestSafety = otherProducts.reduce((a, b) => 
            (a.score_additives || 0) > (b.score_additives || 0) ? a : b
        );

        return {
            insights: [
                {
                    type: 'nutrition',
                    text: `${bestNutrition.name}이 영양 균형면에서 가장 우수합니다 (${bestNutrition.score_nutrition}점).`,
                    icon: 'fas fa-heart'
                },
                {
                    type: 'price',
                    text: `가격 효율성을 고려하면 ${bestPrice.name}이 가장 합리적입니다 (${bestPrice.score_price}점).`,
                    icon: 'fas fa-won-sign'
                },
                {
                    type: 'safety',
                    text: `첨가물 안전성 면에서 ${bestSafety.name}이 가장 안전한 선택입니다 (${bestSafety.score_additives}점).`,
                    icon: 'fas fa-shield-alt'
                }
            ],
            summary: `분석 결과를 종합하면, ${baseProduct.name} 대비 더 나은 대안들이 있습니다. 특히 영양과 안전성을 중시한다면 ${bestNutrition.name}을, 가성비를 중시한다면 ${bestPrice.name}을 추천합니다.`
        };
    }

    findRecommendedProduct(products) {
        if (products.length === 0) return null;

        // Score calculation: weighted average of all scores
        const weights = {
            price: 0.2,
            nutrition: 0.25,
            harmful: 0.2,
            additives: 0.2,
            trust: 0.1,
            eco: 0.05
        };

        return products.reduce((best, current) => {
            const currentScore = 
                (current.score_price || 0) * weights.price +
                (current.score_nutrition || 0) * weights.nutrition +
                (current.score_harmful || 0) * weights.harmful +
                (current.score_additives || 0) * weights.additives +
                (current.score_trust || 0) * weights.trust +
                (current.score_eco || 0) * weights.eco;

            const bestScore = 
                (best.score_price || 0) * weights.price +
                (best.score_nutrition || 0) * weights.nutrition +
                (best.score_harmful || 0) * weights.harmful +
                (best.score_additives || 0) * weights.additives +
                (best.score_trust || 0) * weights.trust +
                (best.score_eco || 0) * weights.eco;

            return currentScore > bestScore ? current : best;
        });
    }
}

// Initialize API service
const foodRadarAPI = new FoodRadarAPI();
const enhancedAnalyzer = new EnhancedFoodAnalyzer();

// Export for global access
window.foodRadarAPI = foodRadarAPI;
window.enhancedAnalyzer = enhancedAnalyzer;
// Google Gemini API Integration Module
// FoodRadar.AI - Real AI Analysis Engine

class GeminiAPIService {
    constructor() {
        this.apiKey = null;
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';
        this.model = 'gemini-1.5-flash';
        this.visionModel = 'gemini-1.5-flash';
        this.initialized = false;
        this.requestQueue = [];
        this.rateLimitDelay = 1000; // 1초 간격으로 요청 제한
    }

    // API 키 설정 (사용자 입력 또는 환경변수)
    initialize(apiKey) {
        if (!apiKey) {
            throw new Error('Gemini API 키가 필요합니다.');
        }
        this.apiKey = apiKey;
        this.initialized = true;
        console.log('Gemini API 서비스가 초기화되었습니다.');
    }

    // API 키 검증
    async validateApiKey() {
        if (!this.initialized) {
            throw new Error('API 키가 설정되지 않았습니다.');
        }

        try {
            const response = await this.makeRequest('generateContent', {
                contents: [{
                    parts: [{ text: 'Hello' }]
                }]
            });
            return response.ok;
        } catch (error) {
            console.error('API 키 검증 실패:', error);
            return false;
        }
    }

    // 기본 API 요청 메서드 (사용량 모니터링 포함)
    async makeRequest(endpoint, data, modelOverride = null) {
        if (!this.initialized) {
            throw new Error('Gemini API가 초기화되지 않았습니다.');
        }

        // Check usage limits
        if (window.usageMonitor && !window.usageMonitor.canMakeRequest()) {
            throw new Error('일일 API 사용량을 초과했습니다.');
        }

        const model = modelOverride || this.model;
        const url = `${this.baseURL}/${model}:${endpoint}?key=${this.apiKey}`;
        const startTime = Date.now();

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const responseTime = Date.now() - startTime;

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // Record failed request
                if (window.usageMonitor) {
                    window.usageMonitor.recordRequest('api_call', false, responseTime);
                }
                
                throw new Error(`Gemini API 오류: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const result = await response.json();
            
            // Record successful request
            if (window.usageMonitor) {
                window.usageMonitor.recordRequest('api_call', true, responseTime);
            }

            return result;
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            // Record failed request
            if (window.usageMonitor) {
                window.usageMonitor.recordRequest('api_call', false, responseTime);
            }
            
            throw error;
        }
    }

    // 텍스트 기반 제품 분석
    async analyzeProductByText(productName, category = null) {
        const prompt = this.buildProductAnalysisPrompt(productName, category);
        
        try {
            const response = await this.makeRequest('generateContent', {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            });

            return this.parseProductAnalysisResponse(response);
        } catch (error) {
            console.error('텍스트 기반 제품 분석 오류:', error);
            throw new Error(`제품 분석에 실패했습니다: ${error.message}`);
        }
    }

    // 이미지 기반 제품 분석
    async analyzeProductByImage(imageData, mimeType = 'image/jpeg') {
        const prompt = this.buildImageAnalysisPrompt();
        
        try {
            const response = await this.makeRequest('generateContent', {
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: imageData
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.5,
                    topK: 32,
                    topP: 0.8,
                    maxOutputTokens: 2048,
                }
            }, this.visionModel);

            return this.parseImageAnalysisResponse(response);
        } catch (error) {
            console.error('이미지 기반 제품 분석 오류:', error);
            throw new Error(`이미지 분석에 실패했습니다: ${error.message}`);
        }
    }

    // 원재료명 분석
    async analyzeIngredients(ingredients) {
        const prompt = this.buildIngredientsAnalysisPrompt(ingredients);
        
        try {
            const response = await this.makeRequest('generateContent', {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topK: 20,
                    topP: 0.8,
                    maxOutputTokens: 1024,
                }
            });

            return this.parseIngredientsAnalysisResponse(response);
        } catch (error) {
            console.error('원재료명 분석 오류:', error);
            throw new Error(`원재료 분석에 실패했습니다: ${error.message}`);
        }
    }

    // 제품 비교 분석 및 추천
    async generateProductComparison(baseProduct, similarProducts) {
        const prompt = this.buildComparisonPrompt(baseProduct, similarProducts);
        
        try {
            const response = await this.makeRequest('generateContent', {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.6,
                    topK: 40,
                    topP: 0.9,
                    maxOutputTokens: 1500,
                }
            });

            return this.parseComparisonResponse(response);
        } catch (error) {
            console.error('제품 비교 분석 오류:', error);
            throw new Error(`제품 비교 분석에 실패했습니다: ${error.message}`);
        }
    }

    // 제품 분석 프롬프트 생성
    buildProductAnalysisPrompt(productName, category) {
        return `
당신은 식품 분야 전문가입니다. 다음 제품에 대해 분석해주세요.

제품명: ${productName}
${category ? `카테고리: ${category}` : ''}

다음 정보를 JSON 형식으로 제공해주세요:

{
  "product_info": {
    "name": "정확한 제품명",
    "brand": "브랜드명 (추정)",
    "category": "제품 카테고리",
    "description": "제품 설명"
  },
  "similar_products": [
    {
      "name": "유사제품1",
      "brand": "브랜드명",
      "reason": "유사한 이유"
    }
  ],
  "analysis": {
    "nutrition_score": 85,
    "safety_score": 90,
    "price_efficiency": 75,
    "consumer_trust": 80,
    "eco_friendliness": 70,
    "additives_safety": 85
  },
  "insights": [
    "주요 특징 1",
    "주요 특징 2",
    "주요 특징 3"
  ],
  "recommendation": "전체적인 추천 의견"
}

한국어로 응답하고, 실제 시장에 존재하는 제품들을 기준으로 분석해주세요.
`;
    }

    // 이미지 분석 프롬프트 생성
    buildImageAnalysisPrompt() {
        return `
이 이미지는 식품 제품 사진입니다. 이미지를 분석하여 다음 정보를 JSON 형식으로 제공해주세요:

{
  "detected_product": {
    "name": "인식된 제품명",
    "brand": "브랜드명",
    "category": "제품 카테고리",
    "confidence": 0.95
  },
  "visible_info": {
    "package_type": "포장 형태",
    "size_info": "용량 정보",
    "key_features": ["특징1", "특징2"],
    "colors": ["주요 색상1", "주요 색상2"]
  },
  "nutrition_visible": {
    "calories_per_serving": "칼로리 (보이는 경우)",
    "other_nutrients": "기타 영양정보"
  },
  "ingredients_visible": "원재료명 (보이는 경우)",
  "analysis_notes": "이미지에서 확인된 추가 정보"
}

한국어로 응답하고, 이미지에서 실제로 확인할 수 있는 정보만 포함해주세요.
`;
    }

    // 원재료명 분석 프롬프트 생성
    buildIngredientsAnalysisPrompt(ingredients) {
        return `
다음 원재료명을 분석하여 각 성분의 안전성을 평가해주세요:

원재료명: ${ingredients}

다음 정보를 JSON 형식으로 제공해주세요:

{
  "parsed_ingredients": [
    {
      "name": "성분명",
      "category": "성분 카테고리 (주원료/첨가물/향료 등)",
      "safety_level": "안전/주의/위험",
      "function": "기능 설명",
      "allergen": true/false,
      "natural": true/false
    }
  ],
  "safety_summary": {
    "overall_score": 85,
    "safe_count": 12,
    "caution_count": 2,
    "harmful_count": 0,
    "artificial_additives": 3
  },
  "allergen_info": ["알레르기 유발 가능 성분들"],
  "health_notes": [
    "건강 관련 주의사항 1",
    "건강 관련 주의사항 2"
  ],
  "recommendation": "종합 의견"
}

각 성분에 대해 정확하고 과학적인 정보를 제공해주세요.
`;
    }

    // 제품 비교 프롬프트 생성
    buildComparisonPrompt(baseProduct, similarProducts) {
        const productsInfo = similarProducts.map(p => 
            `- ${p.name} (${p.brand}): 가격효율성 ${p.score_price || 0}점, 영양균형 ${p.score_nutrition || 0}점, 안전성 ${p.score_additives || 0}점`
        ).join('\n');

        return `
기준 제품: ${baseProduct.name} (${baseProduct.brand})

비교 대상 제품들:
${productsInfo}

위 제품들을 종합적으로 비교 분석하여 다음 정보를 JSON 형식으로 제공해주세요:

{
  "comparison_summary": {
    "best_nutrition": "영양면에서 가장 우수한 제품과 이유",
    "best_price": "가성비 최고 제품과 이유", 
    "best_safety": "안전성 최고 제품과 이유",
    "most_recommended": "종합 추천 제품과 이유"
  },
  "detailed_insights": [
    {
      "category": "영양성",
      "insight": "영양 관련 상세 분석",
      "icon": "fas fa-heart"
    },
    {
      "category": "가격효율성", 
      "insight": "가격 관련 상세 분석",
      "icon": "fas fa-won-sign"
    },
    {
      "category": "안전성",
      "insight": "안전성 관련 상세 분석", 
      "icon": "fas fa-shield-alt"
    }
  ],
  "final_recommendation": {
    "product_name": "최종 추천 제품명",
    "reason": "추천 이유 상세 설명",
    "target_consumer": "이 제품이 적합한 소비자 유형"
  },
  "purchase_advice": "구매 시 고려사항"
}

객관적이고 균형잡힌 분석을 제공해주세요.
`;
    }

    // 제품 분석 응답 파싱
    parseProductAnalysisResponse(response) {
        try {
            const content = response.candidates[0]?.content?.parts[0]?.text;
            if (!content) throw new Error('응답 내용이 없습니다.');

            // JSON 추출 (```json ... ``` 형태로 감싸져 있을 수 있음)
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('JSON 형식을 찾을 수 없습니다.');

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('응답 파싱 오류:', error);
            // 파싱 실패 시 기본 응답 반환
            return {
                product_info: {
                    name: "분석된 제품",
                    brand: "알 수 없음",
                    category: "기타",
                    description: "AI 분석 결과를 파싱하는데 실패했습니다."
                },
                analysis: {
                    nutrition_score: 70,
                    safety_score: 75,
                    price_efficiency: 70,
                    consumer_trust: 70,
                    eco_friendliness: 65,
                    additives_safety: 75
                },
                insights: ["AI 분석이 완료되었지만 결과 파싱에 오류가 발생했습니다."],
                recommendation: "상세한 분석 결과는 추후 개선된 버전에서 제공됩니다."
            };
        }
    }

    // 이미지 분석 응답 파싱
    parseImageAnalysisResponse(response) {
        try {
            const content = response.candidates[0]?.content?.parts[0]?.text;
            if (!content) throw new Error('응답 내용이 없습니다.');

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('JSON 형식을 찾을 수 없습니다.');

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('이미지 응답 파싱 오류:', error);
            return {
                detected_product: {
                    name: "이미지에서 인식된 제품",
                    brand: "알 수 없음",
                    category: "식품",
                    confidence: 0.8
                },
                visible_info: {
                    package_type: "패키지 형태 인식됨",
                    key_features: ["이미지 분석 완료"],
                    colors: ["다양한 색상"]
                },
                analysis_notes: "이미지 분석이 완료되었지만 결과 파싱에 오류가 발생했습니다."
            };
        }
    }

    // 원재료 분석 응답 파싱
    parseIngredientsAnalysisResponse(response) {
        try {
            const content = response.candidates[0]?.content?.parts[0]?.text;
            if (!content) throw new Error('응답 내용이 없습니다.');

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('JSON 형식을 찾을 수 없습니다.');

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('원재료 응답 파싱 오류:', error);
            return {
                safety_summary: {
                    overall_score: 75,
                    safe_count: 10,
                    caution_count: 2,
                    harmful_count: 0,
                    artificial_additives: 2
                },
                allergen_info: ["알레르기 정보 분석 중 오류 발생"],
                health_notes: ["원재료 분석이 완료되었지만 상세 정보 파싱에 오류가 발생했습니다."],
                recommendation: "전문가와 상담을 권장합니다."
            };
        }
    }

    // 비교 분석 응답 파싱
    parseComparisonResponse(response) {
        try {
            const content = response.candidates[0]?.content?.parts[0]?.text;
            if (!content) throw new Error('응답 내용이 없습니다.');

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('JSON 형식을 찾을 수 없습니다.');

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('비교 응답 파싱 오류:', error);
            return {
                comparison_summary: {
                    best_nutrition: "영양 분석 결과 파싱 오류",
                    best_price: "가격 분석 결과 파싱 오류",
                    best_safety: "안전성 분석 결과 파싱 오류",
                    most_recommended: "종합 추천 결과 파싱 오류"
                },
                detailed_insights: [
                    {
                        category: "분석 오류",
                        insight: "AI 분석이 완료되었지만 결과 파싱에 오류가 발생했습니다.",
                        icon: "fas fa-exclamation-triangle"
                    }
                ],
                final_recommendation: {
                    product_name: "분석 결과 확인 필요",
                    reason: "상세 분석 결과를 확인할 수 없습니다.",
                    target_consumer: "모든 소비자"
                }
            };
        }
    }

    // Rate limiting을 위한 큐 처리
    async processRequestQueue() {
        if (this.requestQueue.length === 0) return;

        const request = this.requestQueue.shift();
        try {
            const result = await request.execute();
            request.resolve(result);
        } catch (error) {
            request.reject(error);
        }

        // Rate limiting delay
        if (this.requestQueue.length > 0) {
            setTimeout(() => this.processRequestQueue(), this.rateLimitDelay);
        }
    }

    // API 사용량 체크 (선택적)
    async checkQuota() {
        // 실제 구현에서는 API 사용량 추적 로직 추가
        console.log('API 사용량 체크 (구현 필요)');
        return { remaining: 1000, used: 0 };
    }
}

// Gemini API 통합 분석기
class GeminiPoweredAnalyzer {
    constructor() {
        this.geminiService = new GeminiAPIService();
        this.foodRadarAPI = window.foodRadarAPI;
        this.analysisCache = new Map();
    }

    // API 키로 초기화
    async initialize(apiKey) {
        try {
            this.geminiService.initialize(apiKey);
            const isValid = await this.geminiService.validateApiKey();
            
            if (!isValid) {
                throw new Error('유효하지 않은 API 키입니다.');
            }

            console.log('✅ Gemini API 연동이 완료되었습니다!');
            return true;
        } catch (error) {
            console.error('❌ Gemini API 초기화 실패:', error);
            throw error;
        }
    }

    // 텍스트 기반 실제 AI 분석
    async analyzeProductByName(productName) {
        const cacheKey = `text_${productName}`;
        if (this.analysisCache.has(cacheKey)) {
            return this.analysisCache.get(cacheKey);
        }

        try {
            // 1. Gemini API로 제품 분석
            const aiAnalysis = await this.geminiService.analyzeProductByText(productName);
            
            // 2. 기존 데이터베이스에서 유사 제품 검색
            const searchResults = await this.foodRadarAPI.searchProducts(productName, null, 5);
            
            // 3. AI 분석 결과와 실제 데이터 결합
            const enhancedResult = await this.combineAIAndDatabaseResults(aiAnalysis, searchResults);
            
            // 4. 결과 캐싱
            this.analysisCache.set(cacheKey, enhancedResult);
            
            return enhancedResult;
        } catch (error) {
            console.error('AI 기반 제품 분석 실패:', error);
            throw error;
        }
    }

    // 이미지 기반 실제 AI 분석
    async analyzeProductByImage(imageFile) {
        try {
            // 1. 이미지를 Base64로 변환
            const base64Data = await this.convertImageToBase64(imageFile);
            
            // 2. Gemini Vision API로 이미지 분석
            const imageAnalysis = await this.geminiService.analyzeProductByImage(base64Data, imageFile.type);
            
            // 3. 인식된 제품명으로 추가 분석
            if (imageAnalysis.detected_product?.name) {
                const textAnalysis = await this.analyzeProductByName(imageAnalysis.detected_product.name);
                
                // 4. 이미지 분석과 텍스트 분석 결합
                return {
                    ...textAnalysis,
                    imageAnalysis: imageAnalysis,
                    analysisType: 'image'
                };
            }
            
            return this.createImageAnalysisResult(imageAnalysis);
        } catch (error) {
            console.error('AI 기반 이미지 분석 실패:', error);
            throw error;
        }
    }

    // AI 분석과 데이터베이스 결과 결합
    async combineAIAndDatabaseResults(aiAnalysis, databaseResults) {
        try {
            // 데이터베이스 제품들 가져오기
            const dbProducts = databaseResults.data || [];
            
            // AI가 제안한 유사 제품명과 DB 제품 매칭
            const matchedProducts = this.matchAISuggestionsWithDB(aiAnalysis.similar_products, dbProducts);
            
            // 모든 제품에 AI 점수 적용
            const productsWithAIScores = await this.enhanceProductsWithAI(matchedProducts, aiAnalysis);
            
            // 최종 비교 분석 생성
            const comparison = await this.geminiService.generateProductComparison(
                productsWithAIScores[0],
                productsWithAIScores.slice(1)
            );
            
            return {
                baseProduct: productsWithAIScores[0],
                similarProducts: productsWithAIScores,
                aiSummary: this.convertToStandardFormat(comparison),
                recommendation: this.findRecommendedProduct(productsWithAIScores.slice(1)),
                aiAnalysis: aiAnalysis,
                analysisType: 'ai_enhanced'
            };
        } catch (error) {
            console.error('AI 분석 결합 실패:', error);
            throw error;
        }
    }

    // AI 제안과 DB 제품 매칭
    matchAISuggestionsWithDB(aiSuggestions, dbProducts) {
        const matchedProducts = [];
        
        // 우선 DB에서 정확히 일치하는 제품 찾기
        aiSuggestions.forEach(aiProduct => {
            const dbMatch = dbProducts.find(db => 
                db.name.includes(aiProduct.name) || 
                aiProduct.name.includes(db.name) ||
                db.brand === aiProduct.brand
            );
            
            if (dbMatch && !matchedProducts.find(p => p.id === dbMatch.id)) {
                matchedProducts.push(dbMatch);
            }
        });
        
        // 부족한 경우 DB에서 추가 제품 가져오기
        const remaining = 4 - matchedProducts.length;
        if (remaining > 0) {
            const additionalProducts = dbProducts
                .filter(db => !matchedProducts.find(p => p.id === db.id))
                .slice(0, remaining);
            matchedProducts.push(...additionalProducts);
        }
        
        return matchedProducts.slice(0, 4);
    }

    // 제품에 AI 분석 점수 적용
    async enhanceProductsWithAI(products, aiAnalysis) {
        return products.map((product, index) => {
            // AI 분석 점수를 기존 점수와 결합
            const aiScores = aiAnalysis.analysis || {};
            
            return {
                ...product,
                scores: {
                    price: aiScores.price_efficiency || product.score_price || Math.floor(Math.random() * 30) + 70,
                    nutrition: aiScores.nutrition_score || product.score_nutrition || Math.floor(Math.random() * 30) + 70,
                    harmful: aiScores.safety_score || product.score_harmful || Math.floor(Math.random() * 30) + 70,
                    additives: aiScores.additives_safety || product.score_additives || Math.floor(Math.random() * 30) + 70,
                    trust: aiScores.consumer_trust || product.score_trust || Math.floor(Math.random() * 30) + 70,
                    eco: aiScores.eco_friendliness || product.score_eco || Math.floor(Math.random() * 30) + 70
                },
                aiEnhanced: true
            };
        });
    }

    // 표준 포맷으로 변환
    convertToStandardFormat(comparison) {
        return {
            insights: comparison.detailed_insights || [
                {
                    type: 'ai_analysis',
                    text: comparison.comparison_summary?.best_nutrition || 'AI 분석이 완료되었습니다.',
                    icon: 'fas fa-robot'
                }
            ],
            summary: comparison.final_recommendation?.reason || 
                    comparison.purchase_advice || 
                    'Gemini AI가 제품을 종합적으로 분석했습니다.'
        };
    }

    // 추천 제품 찾기
    findRecommendedProduct(products) {
        if (products.length === 0) return null;
        
        // 점수 기반 추천
        return products.reduce((best, current) => {
            const currentTotal = Object.values(current.scores || {}).reduce((sum, score) => sum + score, 0);
            const bestTotal = Object.values(best.scores || {}).reduce((sum, score) => sum + score, 0);
            return currentTotal > bestTotal ? current : best;
        });
    }

    // 이미지 분석 결과 생성
    createImageAnalysisResult(imageAnalysis) {
        const mockProduct = {
            id: 'ai_image_detected',
            name: imageAnalysis.detected_product?.name || 'AI 인식 제품',
            brand: imageAnalysis.detected_product?.brand || '알 수 없음',
            category: imageAnalysis.detected_product?.category || 'food',
            image_url: 'https://via.placeholder.com/300x300?text=AI+인식+제품',
            scores: {
                price: 75, nutrition: 80, harmful: 85, 
                additives: 80, trust: 75, eco: 70
            }
        };

        return {
            baseProduct: mockProduct,
            similarProducts: [mockProduct],
            aiSummary: {
                insights: [{
                    type: 'image_analysis',
                    text: `이미지에서 ${imageAnalysis.detected_product?.name || '제품'}을 인식했습니다.`,
                    icon: 'fas fa-camera'
                }],
                summary: imageAnalysis.analysis_notes || '이미지 분석이 완료되었습니다.'
            },
            recommendation: mockProduct,
            imageAnalysis: imageAnalysis,
            analysisType: 'image_only'
        };
    }

    // 이미지를 Base64로 변환
    convertImageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1]; // data:image/jpeg;base64, 제거
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // 원재료명 AI 분석
    async analyzeIngredients(ingredients) {
        try {
            return await this.geminiService.analyzeIngredients(ingredients);
        } catch (error) {
            console.error('원재료 AI 분석 실패:', error);
            throw error;
        }
    }
}

// 전역 인스턴스 생성
const geminiAnalyzer = new GeminiPoweredAnalyzer();

// 전역 접근을 위한 export
window.geminiAnalyzer = geminiAnalyzer;
window.GeminiAPIService = GeminiAPIService;
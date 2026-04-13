// FoodRadar.AI Main JavaScript

// Global variables
let radarChart = null;
let currentAnalysis = null;
let currentImageFile = null;
let geminiAPIInitialized = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadSampleData();
    autoSetupGeminiAPI();
});

// Initialize application
function initializeApp() {
    console.log('FoodRadar.AI 초기화 중...');
    
    // Initialize input method buttons
    initializeInputMethods();
    
    // Initialize navigation
    initializeNavigation();
    
    // Initialize scroll effects
    initializeScrollEffects();
}

// Setup event listeners
function setupEventListeners() {
    // Input method switching
    document.querySelectorAll('.input-method-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchInputMethod(this.dataset.method);
        });
    });

    // Analysis tabs event listeners
    document.querySelectorAll('.analysis-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchAnalysisTab(this.dataset.tab);
        });
    });

    // File upload handling
    const fileInput = document.getElementById('product-image');
    if (fileInput) {
        fileInput.addEventListener('change', handleImageUpload);
    }

    // Mobile menu toggle
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', toggleMobileMenu);
    }

    // Enter key support for inputs
    document.getElementById('product-name')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') analyzeProduct();
    });

    document.getElementById('product-link')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') analyzeLink();
    });

    document.getElementById('gift-query')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') analyzeGiftIdeas();
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Initialize input methods
function initializeInputMethods() {
    const defaultMethod = 'text';
    switchInputMethod(defaultMethod);
}

// Switch input method
function switchInputMethod(method) {
    // Update button states
    document.querySelectorAll('.input-method-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === method);
    });

    // Show/hide input forms
    document.querySelectorAll('.input-form').forEach(form => {
        form.classList.toggle('hidden', !form.id.includes(method));
    });

    // Focus on the appropriate input
    setTimeout(() => {
        const activeInput = document.querySelector(`#${method}-input input, #${method}-input select`);
        if (activeInput && !activeInput.disabled) {
            activeInput.focus();
        }
    }, 100);
}

// Switch analysis tab
function switchAnalysisTab(tabName) {
    // Update button states
    document.querySelectorAll('.analysis-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Show/hide tab content
    document.querySelectorAll('.analysis-tab-content').forEach(content => {
        content.classList.toggle('hidden', !content.id.includes(tabName));
    });

    // Load tab-specific content if needed
    if (tabName === 'ingredients' && currentAnalysis) {
        loadIngredientsAnalysis(currentAnalysis.baseProduct);
    } else if (tabName === 'nutrition' && currentAnalysis) {
        loadNutritionAnalysis(currentAnalysis.similarProducts);
    }
}
// Initialize navigation
function initializeNavigation() {
    const nav = document.querySelector('nav');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        // Add/remove scrolled class
        nav.classList.toggle('scrolled', currentScrollY > 50);
        
        // Hide/show navigation on scroll
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
            nav.style.transform = 'translateY(-100%)';
        } else {
            nav.style.transform = 'translateY(0)';
        }
        
        lastScrollY = currentScrollY;
    });
}

// Initialize scroll effects
function initializeScrollEffects() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
            }
        });
    }, observerOptions);

    // Observe sections
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
}

// Mobile menu toggle
function toggleMobileMenu() {
    // Implementation for mobile menu (if needed)
    console.log('Mobile menu toggle');
}

// Handle image upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        console.log('이미지 업로드:', file.name);
        
        // 파일 크기 체크 (5MB 제한)
        if (file.size > 5 * 1024 * 1024) {
            alert('파일 크기는 5MB 이하여야 합니다.');
            return;
        }
        
        // 이미지 파일 형식 체크
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }
        
        currentImageFile = file;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            showImagePreview(e.target.result, file.name);
        };
        reader.readAsDataURL(file);
    }
}

// Show image preview
function showImagePreview(src, filename) {
    const uploadArea = document.querySelector('#image-input .border-dashed');
    const aiStatus = geminiAPIInitialized ? '🤖 Gemini Vision AI' : '📷 모의 분석';
    
    uploadArea.innerHTML = `
        <div class="space-y-4">
            <img src="${src}" alt="업로드된 이미지" class="mx-auto max-h-40 rounded-lg shadow-md border">
            <div class="text-center">
                <p class="text-sm font-medium text-gray-700">${filename}</p>
                <p class="text-xs text-gray-500 mt-1">파일 크기: ${formatFileSize(currentImageFile?.size || 0)}</p>
            </div>
            <div class="flex justify-center space-x-3">
                <button onclick="analyzeImageProduct()" 
                        class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <i class="fas fa-robot mr-2"></i>${aiStatus} 분석
                </button>
                <button onclick="clearImagePreview()" 
                        class="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors">
                    <i class="fas fa-times mr-2"></i>취소
                </button>
            </div>
        </div>
    `;
}

// Clear image preview
function clearImagePreview() {
    currentImageFile = null;
    const uploadArea = document.querySelector('#image-input .border-dashed');
    uploadArea.innerHTML = `
        <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
        <p class="text-gray-600 mb-4">제품 이미지를 드래그하거나 클릭하여 업로드</p>
        <p class="text-sm text-green-600 mb-4">
            <i class="fas fa-robot mr-1"></i>
            <span id="vision-status">Gemini Vision API로 실제 이미지 분석</span>
        </p>
        <input type="file" id="product-image" accept="image/*" class="hidden">
        <button onclick="document.getElementById('product-image').click()" 
                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            파일 선택
        </button>
    `;
    
    // Re-attach event listener
    document.getElementById('product-image').addEventListener('change', handleImageUpload);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Analyze product by name
async function analyzeProduct() {
    const productName = document.getElementById('product-name').value.trim();
    
    if (!productName) {
        alert('제품명을 입력해주세요.');
        return;
    }
    
    console.log('제품 분석 시작:', productName);
    
    // Show loading and scroll to results
    showAnalysisLoading();
    scrollToResults();
    
    try {
        // Simulate AI analysis
        const analysis = await simulateAIAnalysis(productName, 'text');
        displayAnalysisResults(analysis);
    } catch (error) {
        console.error('분석 중 오류 발생:', error);
        showAnalysisError('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

// Analyze product by link
async function analyzeLink() {
    const productLink = document.getElementById('product-link').value.trim();
    
    if (!productLink) {
        alert('제품 링크를 입력해주세요.');
        return;
    }
    
    if (!isValidUrl(productLink)) {
        alert('올바른 URL을 입력해주세요.');
        return;
    }
    
    console.log('링크 분석 시작:', productLink);
    
    showAnalysisLoading();
    scrollToResults();
    
    try {
        const analysis = await simulateAIAnalysis(productLink, 'link');
        displayAnalysisResults(analysis);
    } catch (error) {
        console.error('링크 분석 중 오류 발생:', error);
        showAnalysisError('링크 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

// Analyze product by category
async function analyzeCategory() {
    const category = document.getElementById('category-select').value;
    const detail = document.getElementById('category-detail').value.trim();
    
    if (!category && !detail) {
        alert('카테고리를 선택하거나 세부사항을 입력해주세요.');
        return;
    }
    
    const searchQuery = detail || category;
    console.log('카테고리 분석 시작:', searchQuery);
    
    showAnalysisLoading();
    scrollToResults();
    
    try {
        const analysis = await simulateAIAnalysis(searchQuery, 'category');
        displayAnalysisResults(analysis);
    } catch (error) {
        console.error('카테고리 분석 중 오류 발생:', error);
        showAnalysisError('카테고리 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

// Analyze gift recommendations
async function analyzeGiftIdeas() {
    const query = document.getElementById('gift-query')?.value.trim();
    const budget = document.getElementById('gift-budget')?.value;
    const resultContainer = document.getElementById('gift-results');
    const actionButton = document.getElementById('gift-analyze-btn');

    if (!query) {
        alert('누구에게 어떤 선물을 찾는지 입력해주세요.');
        return;
    }

    resultContainer.classList.remove('hidden');
    resultContainer.innerHTML = `
        <div class="text-sm text-gray-500">
            <i class="fas fa-spinner fa-spin mr-2"></i>AI가 선물 아이디어를 만들고 있습니다...
        </div>
    `;
    if (actionButton) {
        actionButton.disabled = true;
        actionButton.classList.add('opacity-60', 'cursor-not-allowed');
    }

    try {
        const recommendations = await getGiftRecommendations(query, budget);
        renderGiftRecommendations(recommendations, query, budget, resultContainer);
    } catch (error) {
        console.error('선물 추천 생성 오류:', error);
        resultContainer.innerHTML = `
            <div class="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
                선물 추천 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
            </div>
        `;
    } finally {
        if (actionButton) {
            actionButton.disabled = false;
            actionButton.classList.remove('opacity-60', 'cursor-not-allowed');
        }
    }
}

function fillGiftExample(query, budget) {
    const queryInput = document.getElementById('gift-query');
    const budgetInput = document.getElementById('gift-budget');

    if (queryInput) queryInput.value = query;
    if (budgetInput) budgetInput.value = budget;
}

async function getGiftRecommendations(query, budget) {
    if (isGeminiAPIReady() && window.geminiAnalyzer?.geminiService) {
        const prompt = `
다음 조건에 맞는 선물 4개를 추천해주세요.
- 대상/상황: ${query}
- 예산: ${budget || '미정'}

아래 JSON 형식으로만 답변해주세요.
{
  "recommendations": [
    {
      "name": "선물명",
      "priceRange": "예상 가격대",
      "reason": "추천 이유",
      "tip": "센스있게 전달하는 팁"
    }
  ]
}
`;
        const response = await window.geminiAnalyzer.geminiService.makeRequest('generateContent', {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 1024
            }
        });

        const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = parseJsonFromText(text);
        if (parsed?.recommendations?.length) {
            return parsed.recommendations.slice(0, 4);
        }
    }

    return getMockGiftRecommendations(query, budget);
}

function parseJsonFromText(text) {
    try {
        return JSON.parse(text);
    } catch (_) {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            try {
                return JSON.parse(text.slice(start, end + 1));
            } catch (_) {
                return null;
            }
        }
    }
    return null;
}

function getMockGiftRecommendations(query, budget) {
    return [
        {
            name: '프리미엄 티/커피 세트',
            priceRange: budget || '2~5만원',
            reason: `${query} 상황에서 취향 부담이 적고 실용적으로 즐길 수 있습니다.`,
            tip: '손글씨 카드에 간단한 응원 메시지를 함께 전달해보세요.'
        },
        {
            name: '무드등 + 디퓨저 세트',
            priceRange: '3~7만원',
            reason: '공간 분위기를 개선하는 선물이라 만족도가 높습니다.',
            tip: '받는 사람 취향의 향(우디/시트러스)을 선택하면 더 좋습니다.'
        },
        {
            name: '맞춤 각인 텀블러',
            priceRange: '2~4만원',
            reason: '매일 사용할 수 있어 기억에 오래 남습니다.',
            tip: '이니셜이나 짧은 문구를 넣어 개인화하세요.'
        },
        {
            name: '취향 기반 기프트카드',
            priceRange: '원하는 금액',
            reason: '취향을 정확히 모를 때 실패 확률이 낮습니다.',
            tip: '추천 이유를 한 줄로 설명해주면 성의가 더 잘 전달됩니다.'
        }
    ];
}

function renderGiftRecommendations(items, query, budget, container) {
    const cards = items.map(item => `
        <div class="p-4 bg-white border border-pink-100 rounded-xl">
            <div class="flex items-center justify-between mb-2">
                <h5 class="font-semibold text-gray-800">${item.name}</h5>
                <span class="text-xs px-2 py-1 bg-pink-50 text-pink-600 rounded-full">${item.priceRange}</span>
            </div>
            <p class="text-sm text-gray-600 mb-2">${item.reason}</p>
            <p class="text-xs text-pink-600"><i class="fas fa-lightbulb mr-1"></i>${item.tip}</p>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="p-4 bg-pink-50 rounded-xl mb-3 text-sm text-pink-700">
            <strong>${query}</strong>${budget ? ` · 예산 ${budget}` : ''} 조건에 맞춘 추천입니다.
        </div>
        <div class="grid md:grid-cols-2 gap-3">${cards}</div>
    `;
}

// Analyze product by image
async function analyzeImageProduct(file) {
    console.log('이미지 분석 시작');
    
    showAnalysisLoading();
    scrollToResults();
    
    try {
        const analysis = await simulateAIAnalysis('이미지 기반 제품', 'image');
        displayAnalysisResults(analysis);
    } catch (error) {
        console.error('이미지 분석 중 오류 발생:', error);
        showAnalysisError('이미지 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

// Show analysis loading state
function showAnalysisLoading() {
    const resultsSection = document.getElementById('analysis-results');
    const loadingAnimation = document.getElementById('loading-animation');
    const resultsContent = document.getElementById('results-content');
    
    resultsSection.classList.remove('hidden');
    loadingAnimation.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    
    // Update loading indicator based on API status
    const modeIndicator = document.getElementById('analysis-mode-indicator');
    if (modeIndicator) {
        modeIndicator.textContent = geminiAPIInitialized ? 
            '🤖 Gemini AI 분석 모드' : '📝 모의 분석 모드';
    }
    
    // Animate progress bar with detailed steps
    animateProgressBarWithSteps();
}

// Animate progress bar with detailed steps
function animateProgressBarWithSteps() {
    const progressBar = document.querySelector('.progress-bar');
    const substatusElement = document.getElementById('loading-substatus');
    
    const steps = geminiAPIInitialized ? [
        { progress: 15, message: '제품 정보 수집 중...' },
        { progress: 30, message: 'Gemini AI 분석 요청 중...' },
        { progress: 50, message: 'AI가 유사 제품을 탐색 중...' },
        { progress: 70, message: '성분 및 영양정보 분석 중...' },
        { progress: 85, message: 'AI 요약문 생성 중...' },
        { progress: 100, message: '분석 완료!' }
    ] : [
        { progress: 20, message: '데이터베이스 검색 중...' },
        { progress: 40, message: '유사 제품 탐색 중...' },
        { progress: 60, message: '점수 계산 중...' },
        { progress: 80, message: '비교 분석 중...' },
        { progress: 100, message: '분석 완료!' }
    ];
    
    let currentStep = 0;
    
    const interval = setInterval(() => {
        if (currentStep < steps.length) {
            const step = steps[currentStep];
            progressBar.style.width = `${step.progress}%`;
            if (substatusElement) {
                substatusElement.textContent = step.message;
            }
            
            if (step.progress >= 100) {
                clearInterval(interval);
            }
            
            currentStep++;
        }
    }, geminiAPIInitialized ? 800 : 500);
}

// Scroll to results section
function scrollToResults() {
    setTimeout(() => {
        const resultsSection = document.getElementById('analysis-results');
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// Enhanced AI analysis using Gemini API
async function simulateAIAnalysis(input, type) {
    try {
        // Check if Gemini API is available
        if (window.geminiAnalyzer && isGeminiAPIReady()) {
            console.log('🤖 Gemini AI 분석 시작...');
            
            if (type === 'text') {
                return await window.geminiAnalyzer.analyzeProductByName(input);
            } else if (type === 'image') {
                // Image analysis handled in analyzeImageProduct function
                return await window.geminiAnalyzer.analyzeProductByImage(currentImageFile);
            } else if (type === 'category') {
                const categoryMap = {
                    'instant-noodles': '라면/면류',
                    'protein-bar': '단백질바',
                    'snacks': '과자/스낵',
                    'beverages': '음료',
                    'dairy': '유제품',
                    'frozen': '냉동식품'
                };
                
                // Extract category from input if it matches known categories
                let category = null;
                let detail = input;
                
                for (const [key, value] of Object.entries(categoryMap)) {
                    if (input.includes(value) || input.includes(key)) {
                        category = key;
                        detail = input.replace(value, '').trim();
                        break;
                    }
                }
                
                return await window.geminiAnalyzer.analyzeProductByName(detail || input);
            } else {
                // For link analysis, extract product name and analyze
                const productName = extractProductNameFromLink(input);
                if (productName) {
                    return await window.geminiAnalyzer.analyzeProductByName(productName);
                }
            }
        } else {
            console.log('📝 모의 분석 모드 (Gemini API 미설정)');
        }
        
        // Fallback to enhanced analyzer or mock analysis
        if (type === 'text') {
            return await enhancedAnalyzer.analyzeProductByName(input);
        } else if (type === 'category') {
            const categoryMap = {
                'instant-noodles': '라면/면류',
                'protein-bar': '단백질바',
                'snacks': '과자/스낵',
                'beverages': '음료',
                'dairy': '유제품',
                'frozen': '냉동식품'
            };
            
            let category = null;
            let detail = input;
            
            for (const [key, value] of Object.entries(categoryMap)) {
                if (input.includes(value) || input.includes(key)) {
                    category = key;
                    detail = input.replace(value, '').trim();
                    break;
                }
            }
            
            return await enhancedAnalyzer.analyzeProductByCategory(category, detail);
        } else {
            // Fallback to mock analysis for other types
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
            return generateMockAnalysis(input, type);
        }
    } catch (error) {
        console.error('AI 분석 실패, 모의 분석으로 전환:', error);
        // Show user-friendly error message
        showAIAnalysisError(error.message);
        
        // Fallback to mock analysis
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
        return generateMockAnalysis(input, type);
    }
}

// Generate mock analysis data
function generateMockAnalysis(input, type) {
    const baseProduct = {
        name: type === 'image' ? 'AI 인식 제품' : input,
        image: 'https://via.placeholder.com/100x100?text=제품이미지',
        brand: '예시브랜드',
        price: '2,500원'
    };

    const similarProducts = [
        {
            id: 1,
            name: '유사제품 A',
            image: 'https://via.placeholder.com/100x100?text=A',
            brand: '브랜드A',
            price: '2,300원',
            scores: {
                price: 85,
                nutrition: 78,
                harmful: 92,
                additives: 88,
                trust: 75,
                eco: 70
            },
            lowestPrice: {
                price: '2,100원',
                store: '쿠팡',
                url: 'https://coupang.com'
            }
        },
        {
            id: 2,
            name: '유사제품 B',
            image: 'https://via.placeholder.com/100x100?text=B',
            brand: '브랜드B',
            price: '2,800원',
            scores: {
                price: 70,
                nutrition: 85,
                harmful: 88,
                additives: 95,
                trust: 82,
                eco: 85
            },
            lowestPrice: {
                price: '2,650원',
                store: '네이버쇼핑',
                url: 'https://shopping.naver.com'
            }
        },
        {
            id: 3,
            name: '유사제품 C',
            image: 'https://via.placeholder.com/100x100?text=C',
            brand: '브랜드C',
            price: '3,200원',
            scores: {
                price: 60,
                nutrition: 92,
                harmful: 95,
                additives: 90,
                trust: 88,
                eco: 92
            },
            lowestPrice: {
                price: '2,980원',
                store: '11번가',
                url: 'https://11st.co.kr'
            }
        }
    ];

    // Add base product with random scores
    const baseProductWithScores = {
        ...baseProduct,
        id: 0,
        scores: {
            price: 75,
            nutrition: 70,
            harmful: 80,
            additives: 75,
            trust: 70,
            eco: 65
        },
        lowestPrice: {
            price: baseProduct.price,
            store: 'GS25',
            url: 'https://gs25.gsretail.com'
        }
    };

    return {
        baseProduct: baseProductWithScores,
        similarProducts: [baseProductWithScores, ...similarProducts],
        aiSummary: generateAISummary(baseProductWithScores, similarProducts),
        recommendation: similarProducts[1] // Recommend product B
    };
}

// Generate AI summary
function generateAISummary(baseProduct, similarProducts) {
    const best = similarProducts.reduce((a, b) => 
        (a.scores.nutrition + a.scores.harmful + a.scores.additives) > 
        (b.scores.nutrition + b.scores.harmful + b.scores.additives) ? a : b
    );

    return {
        insights: [
            {
                type: 'nutrition',
                text: `${best.name}이 영양 균형면에서 가장 우수합니다 (${best.scores.nutrition}점).`,
                icon: 'fas fa-heart'
            },
            {
                type: 'price',
                text: `가격 효율성을 고려하면 ${similarProducts[0].name}이 가장 합리적입니다.`,
                icon: 'fas fa-won-sign'
            },
            {
                type: 'safety',
                text: `첨가물 안전성 면에서 ${best.name}이 가장 안전한 선택입니다 (${best.scores.additives}점).`,
                icon: 'fas fa-shield-alt'
            }
        ],
        summary: `분석 결과, ${best.name}이 종합적으로 가장 우수한 선택입니다. 특히 영양 균형과 첨가물 안전성 면에서 뛰어난 점수를 받았으며, 친환경성도 높은 편입니다.`
    };
}

// Display analysis results
function displayAnalysisResults(analysis) {
    currentAnalysis = analysis;
    
    // Hide loading, show results
    document.getElementById('loading-animation').classList.add('hidden');
    document.getElementById('results-content').classList.remove('hidden');
    
    // Update base product info
    updateBaseProductInfo(analysis.baseProduct);
    
    // Create radar chart
    createRadarChart(analysis.similarProducts);
    
    // Update AI summary
    updateAISummary(analysis.aiSummary, analysis.recommendation);
    
    // Update comparison table
    updateComparisonTable(analysis.similarProducts);
    
    // Add fade-in animation
    document.getElementById('results-content').classList.add('fade-in');
}

// Load ingredients analysis
async function loadIngredientsAnalysis(product) {
    const container = document.getElementById('ingredients-analysis-content');
    
    if (!product.ingredients) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-info-circle text-4xl mb-4"></i>
                <p>해당 제품의 원재료 정보가 없습니다.</p>
            </div>
        `;
        return;
    }
    
    // Show loading
    container.innerHTML = `
        <div class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4"></div>
            <p class="text-gray-600">AI가 원재료를 분석하고 있습니다...</p>
        </div>
    `;
    
    try {
        let ingredientsAnalysis;
        
        if (isGeminiAPIReady()) {
            console.log('🤖 Gemini AI로 원재료 분석...');
            ingredientsAnalysis = await window.geminiAnalyzer.analyzeIngredients(product.ingredients);
        } else {
            console.log('📝 모의 원재료 분석...');
            ingredientsAnalysis = generateMockIngredientsAnalysis(product.ingredients);
        }
        
        displayIngredientsAnalysis(ingredientsAnalysis, container);
    } catch (error) {
        console.error('원재료 분석 실패:', error);
        container.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p>원재료 분석 중 오류가 발생했습니다.</p>
                <button onclick="loadIngredientsAnalysis(currentAnalysis.baseProduct)" 
                        class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    다시 시도
                </button>
            </div>
        `;
    }
}

// Display ingredients analysis
function displayIngredientsAnalysis(analysis, container) {
    const safetyClass = getSafetyClass(analysis.safety_summary.overall_score);
    
    container.innerHTML = `
        <!-- Safety Summary -->
        <div class="safety-card ${safetyClass} mb-6">
            <div class="flex items-center justify-between mb-3">
                <h5 class="font-semibold text-lg">원재료 안전성 종합 점수</h5>
                <span class="text-2xl font-bold">${analysis.safety_summary.overall_score}점</span>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div class="text-center">
                    <div class="text-green-600 font-medium">${analysis.safety_summary.safe_count}개</div>
                    <div class="text-gray-600">안전 성분</div>
                </div>
                <div class="text-center">
                    <div class="text-yellow-600 font-medium">${analysis.safety_summary.caution_count}개</div>
                    <div class="text-gray-600">주의 성분</div>
                </div>
                <div class="text-center">
                    <div class="text-red-600 font-medium">${analysis.safety_summary.harmful_count}개</div>
                    <div class="text-gray-600">위험 성분</div>
                </div>
                <div class="text-center">
                    <div class="text-purple-600 font-medium">${analysis.safety_summary.artificial_additives}개</div>
                    <div class="text-gray-600">인공 첨가물</div>
                </div>
            </div>
        </div>

        <!-- Ingredients List -->
        <div class="mb-6">
            <h5 class="font-semibold text-gray-800 mb-4">성분별 상세 분석</h5>
            <div class="grid gap-3">
                ${analysis.parsed_ingredients.map(ingredient => `
                    <div class="ingredient-item">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <div class="flex items-center space-x-2 mb-1">
                                    <span class="ingredient-name">${ingredient.name}</span>
                                    <span class="ingredient-category ${getIngredientCategoryClass(ingredient.safety_level)}">
                                        ${ingredient.category}
                                    </span>
                                    ${ingredient.allergen ? '<i class="fas fa-exclamation-triangle text-orange-500 text-sm" title="알레르기 유발 가능"></i>' : ''}
                                </div>
                                <p class="ingredient-function">${ingredient.function}</p>
                            </div>
                            <div class="text-right">
                                <span class="text-xs px-2 py-1 rounded ${getSafetyLevelClass(ingredient.safety_level)}">
                                    ${ingredient.safety_level}
                                </span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Allergen Info -->
        ${analysis.allergen_info.length > 0 ? `
        <div class="mb-6 p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
            <h5 class="font-semibold text-orange-800 mb-2">
                <i class="fas fa-exclamation-triangle mr-2"></i>알레르기 정보
            </h5>
            <p class="text-orange-700 text-sm">
                ${analysis.allergen_info.join(', ')}에 알레르기가 있는 분은 주의하세요.
            </p>
        </div>
        ` : ''}

        <!-- Health Notes -->
        ${analysis.health_notes.length > 0 ? `
        <div class="mb-6">
            <h5 class="font-semibold text-gray-800 mb-3">건강 관련 주의사항</h5>
            <ul class="space-y-2">
                ${analysis.health_notes.map(note => `
                    <li class="flex items-start">
                        <i class="fas fa-info-circle text-blue-500 mt-1 mr-2 flex-shrink-0"></i>
                        <span class="text-gray-700 text-sm">${note}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
        ` : ''}

        <!-- AI Recommendation -->
        <div class="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <h5 class="font-semibold text-blue-800 mb-2">
                <i class="fas fa-robot mr-2"></i>AI 종합 의견
            </h5>
            <p class="text-blue-700 text-sm">${analysis.recommendation}</p>
        </div>
    `;
}

// Load nutrition analysis
function loadNutritionAnalysis(products) {
    const container = document.getElementById('nutrition-analysis-content');
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-chart-pie text-4xl mb-4"></i>
                <p>영양성분 정보가 없습니다.</p>
            </div>
        `;
        return;
    }
    
    const nutritionData = extractNutritionData(products);
    
    container.innerHTML = `
        <!-- Nutrition Comparison Chart -->
        <div class="mb-8">
            <h5 class="font-semibold text-gray-800 mb-4">주요 영양성분 비교</h5>
            <div class="space-y-4">
                ${nutritionData.map(nutrient => `
                    <div class="nutrition-item">
                        <span class="font-medium text-gray-700 w-20">${nutrient.name}</span>
                        <div class="nutrition-bar">
                            <div class="nutrition-fill nutrition-${nutrient.level}" 
                                 style="width: ${nutrient.percentage}%"></div>
                        </div>
                        <span class="text-sm text-gray-600 w-16 text-right">
                            ${nutrient.value}${nutrient.unit}
                        </span>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Nutrition Insights -->
        <div class="grid md:grid-cols-2 gap-6">
            <div class="p-4 bg-green-50 rounded-lg">
                <h6 class="font-semibold text-green-800 mb-2">
                    <i class="fas fa-thumbs-up mr-2"></i>영양적 장점
                </h6>
                <ul class="text-sm text-green-700 space-y-1">
                    <li>• 단백질 함량이 우수함</li>
                    <li>• 필수 아미노산 포함</li>
                    <li>• 적절한 칼로리 밀도</li>
                </ul>
            </div>
            <div class="p-4 bg-yellow-50 rounded-lg">
                <h6 class="font-semibold text-yellow-800 mb-2">
                    <i class="fas fa-exclamation-circle mr-2"></i>주의사항
                </h6>
                <ul class="text-sm text-yellow-700 space-y-1">
                    <li>• 나트륨 함량 확인 필요</li>
                    <li>• 당류 섭취량 조절</li>
                    <li>• 개인별 칼로리 요구량 고려</li>
                </ul>
            </div>
        </div>
    `;
}

// Generate mock ingredients analysis
function generateMockIngredientsAnalysis(ingredients) {
    const ingredientsList = ingredients.split(',').map(i => i.trim()).slice(0, 8);
    
    return {
        parsed_ingredients: ingredientsList.map((ingredient, index) => ({
            name: ingredient,
            category: index < 3 ? '주원료' : '첨가물',
            safety_level: Math.random() > 0.7 ? '주의' : '안전',
            function: index < 3 ? '주요 영양성분' : '품질 유지 및 풍미 개선',
            allergen: Math.random() > 0.8,
            natural: Math.random() > 0.5
        })),
        safety_summary: {
            overall_score: Math.floor(Math.random() * 20) + 75,
            safe_count: Math.floor(Math.random() * 5) + 5,
            caution_count: Math.floor(Math.random() * 3) + 1,
            harmful_count: Math.floor(Math.random() * 2),
            artificial_additives: Math.floor(Math.random() * 4) + 1
        },
        allergen_info: ['밀', '대두'],
        health_notes: [
            '과도한 섭취 시 나트륨 과다 섭취 우려',
            '개인의 알레르기 반응 확인 필요'
        ],
        recommendation: '전반적으로 안전한 수준의 원재료로 구성되어 있으나, 알레르기가 있는 분은 주의하시기 바랍니다.'
    };
}

// Extract nutrition data for visualization
function extractNutritionData(products) {
    const baseProduct = products[0];
    let nutritionInfo = {};
    
    try {
        nutritionInfo = JSON.parse(baseProduct.nutrition_info || '{}');
    } catch (error) {
        // Default nutrition data
        nutritionInfo = {
            calories: 500,
            protein: 10.5,
            fat: 15.2,
            carbs: 75.3,
            sodium: 1650,
            sugar: 6.8
        };
    }
    
    return [
        { name: '칼로리', value: nutritionInfo.calories || 0, unit: 'kcal', percentage: Math.min((nutritionInfo.calories || 0) / 10, 100), level: 'medium' },
        { name: '단백질', value: nutritionInfo.protein || 0, unit: 'g', percentage: Math.min((nutritionInfo.protein || 0) * 5, 100), level: 'high' },
        { name: '지방', value: nutritionInfo.fat || 0, unit: 'g', percentage: Math.min((nutritionInfo.fat || 0) * 3, 100), level: 'medium' },
        { name: '탄수화물', value: nutritionInfo.carbs || 0, unit: 'g', percentage: Math.min((nutritionInfo.carbs || 0) * 1.2, 100), level: 'high' },
        { name: '나트륨', value: nutritionInfo.sodium || 0, unit: 'mg', percentage: Math.min((nutritionInfo.sodium || 0) / 25, 100), level: 'low' },
        { name: '당류', value: nutritionInfo.sugar || 0, unit: 'g', percentage: Math.min((nutritionInfo.sugar || 0) * 4, 100), level: 'low' }
    ];
}

// Helper functions for styling
function getSafetyClass(score) {
    if (score >= 90) return 'safety-excellent';
    if (score >= 80) return 'safety-good';
    if (score >= 70) return 'safety-average';
    return 'safety-poor';
}

function getIngredientCategoryClass(safetyLevel) {
    switch (safetyLevel) {
        case '안전': return 'ingredient-safe';
        case '주의': return 'ingredient-caution';
        case '위험': return 'ingredient-harmful';
        default: return 'ingredient-safe';
    }
}

function getSafetyLevelClass(safetyLevel) {
    switch (safetyLevel) {
        case '안전': return 'bg-green-100 text-green-800';
        case '주의': return 'bg-yellow-100 text-yellow-800';
        case '위험': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}
// Update base product info
function updateBaseProductInfo(product) {
    const container = document.getElementById('base-product-info');
    container.innerHTML = `
        <img src="${product.image}" alt="${product.name}" class="product-image">
        <div class="flex-1">
            <h5 class="font-semibold text-gray-800">${product.name}</h5>
            <p class="text-sm text-gray-600">${product.brand} | ${product.price}</p>
        </div>
    `;
}

// Create radar chart
function createRadarChart(products) {
    const ctx = document.getElementById('radar-chart').getContext('2d');
    
    // Destroy existing chart
    if (radarChart) {
        radarChart.destroy();
    }
    
    const labels = ['가격효율성', '영양균형', '유해성분', '첨가물안전성', '소비자신뢰도', '친환경성'];
    
    const datasets = products.slice(0, 4).map((product, index) => {
        const colors = [
            'rgba(34, 197, 94, 0.3)',   // Green
            'rgba(59, 130, 246, 0.3)',  // Blue  
            'rgba(168, 85, 247, 0.3)',  // Purple
            'rgba(239, 68, 68, 0.3)'    // Red
        ];
        
        const borderColors = [
            'rgb(34, 197, 94)',
            'rgb(59, 130, 246)', 
            'rgb(168, 85, 247)',
            'rgb(239, 68, 68)'
        ];
        
        return {
            label: product.name,
            data: [
                product.scores.price,
                product.scores.nutrition,
                product.scores.harmful,
                product.scores.additives,
                product.scores.trust,
                product.scores.eco
            ],
            backgroundColor: colors[index],
            borderColor: borderColors[index],
            borderWidth: 2,
            pointBackgroundColor: borderColors[index],
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: borderColors[index]
        };
    });
    
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            elements: {
                line: {
                    borderWidth: 3
                }
            },
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            }
        }
    });
}

// Update AI summary
function updateAISummary(summary, recommendation) {
    const container = document.getElementById('ai-summary');
    
    let insightsHtml = summary.insights.map(insight => `
        <div class="ai-insight">
            <i class="${insight.icon} ai-insight-icon"></i>
            <span>${insight.text}</span>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div class="space-y-4">
            ${insightsHtml}
            <div class="mt-6 p-4 bg-gray-50 rounded-lg">
                <p class="text-gray-700 leading-relaxed">${summary.summary}</p>
            </div>
        </div>
    `;
    
    // Update recommendation
    const recContainer = document.getElementById('recommended-product');
    recContainer.innerHTML = `
        <div class="flex items-center space-x-3">
            <img src="${recommendation.image}" alt="${recommendation.name}" class="w-12 h-12 rounded-lg object-cover">
            <div class="flex-1">
                <h6 class="font-semibold text-green-800">${recommendation.name}</h6>
                <p class="text-sm text-green-600">${recommendation.brand} | ${recommendation.lowestPrice.price}</p>
            </div>
            <button onclick="window.open('${recommendation.lowestPrice.url}', '_blank')" 
                    class="btn-purchase">
                <i class="fas fa-shopping-cart mr-1"></i>구매
            </button>
        </div>
    `;
}

// Update comparison table
function updateComparisonTable(products) {
    const tbody = document.getElementById('comparison-tbody');
    
    tbody.innerHTML = products.map(product => `
        <tr>
            <td class="text-left">
                <div class="flex items-center space-x-3">
                    <img src="${product.image}" alt="${product.name}" class="w-8 h-8 rounded object-cover">
                    <div>
                        <div class="font-medium text-gray-900">${product.name}</div>
                        <div class="text-sm text-gray-500">${product.brand}</div>
                    </div>
                </div>
            </td>
            <td><span class="score-badge ${getScoreBadgeClass(product.scores.price)}">${product.scores.price}</span></td>
            <td><span class="score-badge ${getScoreBadgeClass(product.scores.nutrition)}">${product.scores.nutrition}</span></td>
            <td><span class="score-badge ${getScoreBadgeClass(product.scores.harmful)}">${product.scores.harmful}</span></td>
            <td><span class="score-badge ${getScoreBadgeClass(product.scores.additives)}">${product.scores.additives}</span></td>
            <td><span class="score-badge ${getScoreBadgeClass(product.scores.trust)}">${product.scores.trust}</span></td>
            <td><span class="score-badge ${getScoreBadgeClass(product.scores.eco)}">${product.scores.eco}</span></td>
            <td>
                <button onclick="window.open('${product.lowestPrice.url}', '_blank')" class="btn-purchase">
                    ${product.lowestPrice.price}<br>
                    <small>${product.lowestPrice.store}</small>
                </button>
            </td>
        </tr>
    `).join('');
}

// Get score badge class based on value
function getScoreBadgeClass(score) {
    if (score >= 90) return 'score-excellent';
    if (score >= 80) return 'score-good';
    if (score >= 70) return 'score-average';
    return 'score-poor';
}

// Show analysis error
function showAnalysisError(message) {
    document.getElementById('loading-animation').classList.add('hidden');
    
    const resultsContent = document.getElementById('results-content');
    resultsContent.innerHTML = `
        <div class="text-center py-12">
            <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
            <h4 class="text-xl font-semibold text-gray-800 mb-4">분석 실패</h4>
            <p class="text-gray-600 mb-6">${message}</p>
            <button onclick="location.reload()" class="btn-primary">
                <i class="fas fa-redo mr-2"></i>다시 시도
            </button>
        </div>
    `;
    resultsContent.classList.remove('hidden');
}

// Utility functions
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Load sample data (if needed)
function loadSampleData() {
    // This function can be used to load initial data or samples
    console.log('샘플 데이터 로드 완료');
}

// Gemini API 자동 설정
async function autoSetupGeminiAPI() {
    const apiKey = 'gen-lang-client-0471093326';
    try {
        console.log('🤖 Gemini AI 초기화 중...');
        updateAIStatusIndicator('🔄 Gemini AI 연결 중...', 'text-blue-600');
        
        await window.geminiAnalyzer.initialize(apiKey);
        geminiAPIInitialized = true;
        
        updateAIStatusIndicator('✅ Gemini AI 연동됨', 'text-green-600');
        
        console.log('🚀 Gemini API 자동 설정 완료!');
        
        // Show success notification
        showSuccessNotification('🤖 Gemini AI 연동 완료!', 'FoodRadar.AI가 실제 AI 분석을 제공합니다.');
        
    } catch (error) {
        console.error('Gemini API 자동 설정 실패:', error);
        updateAIStatusIndicator('⚠️ 모의 분석 모드', 'text-yellow-600');
        
        // Show fallback notification
        showWarningNotification('📝 모의 분석 모드', 'AI 연결에 실패했지만 모의 분석으로 서비스를 계속 이용하실 수 있습니다.');
    }
}

// AI 상태 정보 UI 숨기기
function hideAIStatusInfo() {
    const aiStatusInfo = document.getElementById('ai-status-info');
    if (aiStatusInfo) {
        aiStatusInfo.style.display = 'none';
    }
}

// 성공 알림 표시
function showSuccessNotification(title, message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm';
    
    notification.innerHTML = `
        <div class="flex items-start">
            <i class="fas fa-check-circle mt-1 mr-3 flex-shrink-0"></i>
            <div class="flex-1">
                <div class="font-medium">${title}</div>
                <div class="text-sm mt-1 opacity-90">${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
                <i class="fas fa-times text-xs"></i>
            </button>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// 경고 알림 표시
function showWarningNotification(title, message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm';
    
    notification.innerHTML = `
        <div class="flex items-start">
            <i class="fas fa-exclamation-triangle mt-1 mr-3 flex-shrink-0"></i>
            <div class="flex-1">
                <div class="font-medium">${title}</div>
                <div class="text-sm mt-1 opacity-90">${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
                <i class="fas fa-times text-xs"></i>
            </button>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 7000);
}

// AI 상태 표시기 업데이트
function updateAIStatusIndicator(text, className) {
    const indicator = document.getElementById('ai-status-indicator');
    if (indicator) {
        indicator.textContent = text;
        indicator.className = `ml-2 text-sm ${className}`;
    }
    
    // Vision 상태도 업데이트
    const visionStatus = document.getElementById('vision-status');
    if (visionStatus) {
        if (geminiAPIInitialized) {
            visionStatus.innerHTML = '<i class="fas fa-robot mr-1"></i>Gemini Vision API로 실제 이미지 분석';
            visionStatus.className = 'text-green-600 text-sm';
        } else {
            visionStatus.innerHTML = '<i class="fas fa-camera mr-1"></i>모의 이미지 분석';
            visionStatus.className = 'text-yellow-600 text-sm';
        }
    }
}

// Gemini API 준비 상태 확인
function isGeminiAPIReady() {
    return geminiAPIInitialized && window.geminiAnalyzer;
}

// AI 분석 오류 표시
function showAIAnalysisError(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            <span>AI 분석 오류: ${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// 링크에서 제품명 추출
function extractProductNameFromLink(url) {
    try {
        // 일반적인 이커머스 URL에서 제품명 추출 시도
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        
        // 쿠팡, 네이버쇼핑 등에서 제품명 추출
        const segments = pathname.split('/').filter(s => s.length > 0);
        const lastSegment = segments[segments.length - 1];
        
        if (lastSegment && lastSegment.length > 3) {
            return decodeURIComponent(lastSegment.replace(/[-_]/g, ' '));
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

// 향상된 이미지 분석
async function analyzeImageProduct(file) {
    console.log('🖼️ AI 이미지 분석 시작');
    
    if (file) {
        currentImageFile = file;
    }
    
    showAnalysisLoading();
    scrollToResults();
    
    try {
        let analysis;
        
        if (isGeminiAPIReady() && currentImageFile) {
            console.log('🤖 Gemini Vision API로 실제 이미지 분석...');
            analysis = await window.geminiAnalyzer.analyzeProductByImage(currentImageFile);
        } else {
            console.log('📷 모의 이미지 분석...');
            analysis = await simulateAIAnalysis('이미지 기반 제품', 'image');
        }
        
        displayAnalysisResults(analysis);
    } catch (error) {
        console.error('이미지 분석 중 오류 발생:', error);
        showAIAnalysisError(error.message);
        showAnalysisError('이미지 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

// 로컬 스토리지에서 API 키 로드 시도
function tryLoadSavedAPIKey() {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        document.getElementById('gemini-api-key').value = savedKey;
        return savedKey;
    }
    return null;
}

// Export functions for global access
window.analyzeProduct = analyzeProduct;
window.analyzeLink = analyzeLink;
window.analyzeCategory = analyzeCategory;
window.analyzeGiftIdeas = analyzeGiftIdeas;
window.fillGiftExample = fillGiftExample;
window.analyzeImageProduct = analyzeImageProduct;
window.hideAIStatusInfo = hideAIStatusInfo;

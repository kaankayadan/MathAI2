(function(window, document) {
  'use strict';

  const API_ENDPOINT = '/api/chat_completion';
  const TTS_ENDPOINT = '/api/text_to_speech';

  const AITeacherModal = ({ isOpen, onClose, question, studentAnswer, correctAnswer, problemType }) => {
    const [explanation, setExplanation] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [currentStep, setCurrentStep] = React.useState(0);
    const [error, setError] = React.useState(null);
    const [audioUrls, setAudioUrls] = React.useState([]);
    const [progress, setProgress] = React.useState(0);
    const audioRef = React.useRef(null);
    const [loadingMessage, setLoadingMessage] = React.useState("Yapay zeka öğretmen yükleniyor...");
    const [isPlaying, setIsPlaying] = React.useState(false);

    const { motion, AnimatePresence } = window.Motion;

    React.useEffect(() => {
      if (isOpen) {
        setIsLoading(true);
        setError(null);
        setProgress(0);
        setCurrentStep(0);
        setIsPlaying(false);
        setAudioUrls([]);

        const controller = new AbortController();
        const { signal } = controller;

        const loadingMessages = [
          "Gerekli bağlantılar yapıldı, yapay zeka öğretmen yüklenmeye devam ediyor...",
          "Neredeyse hazır...",
          "Son birkaç hesaplama yapılıyor...",
          "Yapay zeka öğretmen gerekli bilgileri alıyor..."
        ];

        let messageIndex = 0;
        const messageInterval = setInterval(() => {
          setLoadingMessage(loadingMessages[messageIndex % loadingMessages.length]);
          messageIndex++;
        }, 3000);

        const fetchData = async () => {
          try {
            setProgress(10);
            const explanationResponse = await fetch(API_ENDPOINT, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messages: [{
                  role: "system",
                  content: `Sen arkadaşça ve ilgi çekici bir AI matematik öğretmen asistanısın. Amacın, öğrenciye soruyu doğru çözmesi için gereken bilgileri ve adımları açık, anlaşılır ve motive edici bir şekilde sunmaktır. Bu açıklamayı yaparken şu adımları izle:

1. Kısa ve olumlu bir giriş yap. Öğrencinin çabasını takdir et ve öğrenme fırsatına vurgu yap.

2. Sorunun hangi konuyla ilgili olduğunu belirt ve bu konunun temel kavramlarını kısaca hatırlat.

3. Soruyu çözmek için gerekli olan önemli bilgileri veya formülleri açıkla.

4. Doğru çözüm yolunu adım adım açıkla:
   a. Her adımı net ve basit bir dille ifade et.
   b. Matematiksel işlemleri ve sembolleri açık bir şekilde yaz ve açıkla.
   c. Her adımın neden yapıldığını kısaca belirt.

5. Konuyu pekiştirmek için benzer bir örnek ver veya problemin farklı bir versiyonunu sun.

6. Öğrenciyi cesaretlendiren ve gelecekteki çalışmalar için motive eden bir kapanış yap.

Açıklamanı aşağıdaki yapıda bir JSON formatında sağla:
{
  "giris": "Cesaretlendirici açılış cümlesi",
  "konu_ozeti": "İlgili matematik konusunun kısa özeti ve temel kavramları",
  "onemli_bilgiler": "Soru çözümü için gerekli formüller veya bilgiler",
  "cozum_adimlari": [
    {
      "adim": "1. adım açıklaması",
      "aciklama": "Bu adımın nedeni"
    },
    // ... diğer adımlar ...
  ],
  "pekistirme": "Benzer örnek veya farklı versiyon",
  "kapanis": "Cesaretlendirici ve motive edici mesaj"
}`
                }, {
                  role: "user",
                  content: `Şu matematik problemini açıkla:
Soru: ${question}
Öğrencinin Cevabı: ${studentAnswer}
Doğru Cevap: ${correctAnswer}
Problem Türü: ${problemType}
Lütfen yönergeleri takip ederek adım adım bir açıklama sağla.`
                }]
              }),
              signal
            });
            setProgress(50);
            const explanationData = await explanationResponse.json();
            const parsedContent = JSON.parse(explanationData);
            setExplanation(parsedContent);

            // Matematiksel ifadeleri dönüştürmek için fonksiyon
            const convertMathSymbolsToWords = (text) => {
              return text
                .replace(/\+/g, ' artı ')
                .replace(/-/g, ' eksi ')
                .replace(/×|x|\*/g, ' çarpı ')
                .replace(/÷|\//g, ' bölü ')
                .replace(/=/g, ' eşittir ')
                .replace(/\^/g, ' üzeri ')
                .replace(/√/g, ' karekök ')
                .replace(/%/g, ' yüzde ')
                .replace(/π/g, ' pi ')
                .replace(/≤/g, ' küçük veya eşit ')
                .replace(/≥/g, ' büyük veya eşit ')
                .replace(/≠/g, ' eşit değil ')
                .replace(/∑/g, ' toplam ')
                .replace(/∆/g, ' delta ')
                .replace(/∫/g, ' integral ')
                .replace(/∞/g, ' sonsuz ')
                .replace(/°/g, ' derece ')
                .replace(/\s+/g, ' '); // Fazla boşlukları kaldır
            };

            // Her adım için ayrı ses dosyası oluştur
            const audioPromises = [
              fetchAudio(convertMathSymbolsToWords(parsedContent.giris)),
              fetchAudio(convertMathSymbolsToWords(parsedContent.konu_ozeti)),
              fetchAudio(convertMathSymbolsToWords(parsedContent.onemli_bilgiler)),
              ...parsedContent.cozum_adimlari.map(adim => fetchAudio(convertMathSymbolsToWords(`${adim.adim} ${adim.aciklama}`))),
              fetchAudio(convertMathSymbolsToWords(parsedContent.pekistirme)),
              fetchAudio(convertMathSymbolsToWords(parsedContent.kapanis))
            ];

            setProgress(75);
            const audioResults = await Promise.all(audioPromises);
            setAudioUrls(audioResults);

            setIsLoading(false);
            setProgress(100);
            clearInterval(messageInterval);

            // Modal yüklendiğinde ilk adımın sesini otomatik başlat
            setIsPlaying(true);

          } catch (error) {
            if (error.name === 'AbortError') {
              console.log('Fetch aborted');
            } else {
              console.error('AI açıklaması alınırken hata oluştu:', error);
              setError('Açıklama yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
            }
            setIsLoading(false);
            clearInterval(messageInterval);
          }
        };

        fetchData();

        return () => {
          controller.abort();
          clearInterval(messageInterval);
        };
      }
    }, [isOpen, question, studentAnswer, correctAnswer, problemType]);

    const fetchAudio = async (text) => {
      const response = await fetch(TTS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: text,
          voice: 'alloy'
        })
      });
      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    };

    React.useEffect(() => {
      if (audioRef.current && audioUrls.length > 0 && !isLoading) {
        audioRef.current.src = audioUrls[currentStep];
        if (isPlaying) {
          audioRef.current.play();
        }
        const handleAudioEnd = () => {
          setIsPlaying(false);
        };
        audioRef.current.addEventListener('ended', handleAudioEnd);
        return () => {
          audioRef.current.removeEventListener('ended', handleAudioEnd);
        };
      }
    }, [currentStep, audioUrls, isLoading, isPlaying]);

    const handleNext = () => {
      if (currentStep < (audioUrls.length - 1)) {
        setCurrentStep(prevStep => prevStep + 1);
        setIsPlaying(true);
      }
    };

    const handlePrevious = () => {
      if (currentStep > 0) {
        setCurrentStep(prevStep => prevStep - 1);
        setIsPlaying(true);
      }
    };

    const togglePlayPause = () => {
      setIsPlaying(!isPlaying);
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
      }
    };

    if (!isOpen) return null;

    return React.createElement(AnimatePresence, null,
      React.createElement(motion.div, {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        style: {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }
      },
        React.createElement(motion.div, {
          initial: { y: -50, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: 50, opacity: 0 },
          transition: { type: 'spring', damping: 15 },
          style: {
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '15px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          }
        },
          React.createElement('h2', {
            style: {
              borderBottom: '2px solid #4A90E2',
              paddingBottom: '15px',
              color: '#4A90E2',
              fontSize: '24px'
            }
          }, 'AI Öğretmen Açıklaması'),
          isLoading ?
            React.createElement(React.Fragment, null,
              React.createElement(motion.div, {
                style: {
                  width: '100%',
                  height: '20px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  margin: '20px 0'
                }
              },
                React.createElement(motion.div, {
                  initial: { width: 0 },
                  animate: { width: `${progress}%` },
                  transition: { duration: 0.5 },
                  style: {
                    height: '100%',
                    backgroundColor: '#4A90E2'
                  }
                })
              ),
              React.createElement('p', { style: { textAlign: 'center', color: '#4A90E2' } }, loadingMessage)
            ) :
            error ?
              React.createElement('p', { style: { color: 'red' } }, error) :
              React.createElement(React.Fragment, null,
                React.createElement('div', { style: { marginBottom: '20px' } },
                  React.createElement('p', { style: { fontWeight: 'bold' } }, 'Soru: ', question),
                  React.createElement('p', { style: { color: '#D32F2F' } }, 'Öğrenci Cevabı: ', studentAnswer),
                  React.createElement('p', { style: { color: '#388E3C' } }, 'Doğru Cevap: ', correctAnswer)
                ),
                React.createElement(motion.div, {
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0 },
                  transition: { delay: 0.5 },
                  style: { marginTop: '20px' }
                },
                  React.createElement('h3', { style: { color: '#4A90E2' } }, 'Açıklama'),
                  currentStep === 0 && React.createElement(motion.p, {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    transition: { delay: 0.7 }
                  }, explanation?.giris),
                  currentStep === 1 && React.createElement(motion.p, {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    transition: { delay: 0.7 }
                  }, explanation?.konu_ozeti),
                  currentStep === 2 && React.createElement(motion.p, {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    transition: { delay: 0.7 }
                  }, explanation?.onemli_bilgiler),
                  currentStep > 2 && currentStep <= explanation?.cozum_adimlari?.length + 2 && React.createElement('div', { style: { marginTop: '20px' } },
                    React.createElement('h4', { style: { color: '#4A90E2' } }, `${currentStep - 2}. Adım`),
                    React.createElement(motion.div, {
                      key: currentStep,
                      initial: { opacity: 0, x: -20 },
                      animate: { opacity: 1, x: 0 },
                      exit: { opacity: 0, x: 20 },
                      transition: { duration: 0.5 }
                    },
                      React.createElement('p', null, explanation?.cozum_adimlari[currentStep - 3]?.adim),
                      React.createElement('p', { style: { fontStyle: 'italic', color: '#757575' } }, explanation?.cozum_adimlari[currentStep - 3]?.aciklama)
                    )
                  ),
                  currentStep === explanation?.cozum_adimlari?.length + 3 && React.createElement(motion.p, {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    transition: { delay: 0.7 }
                  }, explanation?.pekistirme),
                  currentStep === explanation?.cozum_adimlari?.length + 4 && React.createElement(motion.p, {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    transition: { delay: 0.7 }
                  }, explanation?.kapanis),
                  React.createElement('div', {
                    style: {
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '20px'
                    }
                  },
                    React.createElement('button', {
                      onClick: handlePrevious,
                      disabled: currentStep === 0,
                      style: {
                        padding: '10px 20px',
                        backgroundColor: currentStep === 0 ? '#ccc' : '#4A90E2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: currentStep === 0 ? 'not-allowed' : 'pointer'
                      }
                    }, 'Önceki'),
                    React.createElement('button', {
                      onClick: togglePlayPause,
                      style: {
                        padding: '10px 20px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                      }
                    }, isPlaying ? 'Duraklat' : 'Oynat'),
                    React.createElement('button', {
                      onClick: handleNext,
                      disabled: currentStep === (audioUrls.length - 1),
                      style: {
                        padding: '10px 20px',
                        backgroundColor: currentStep === (audioUrls.length - 1) ? '#ccc' : '#4A90E2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: currentStep === (audioUrls.length - 1) ? 'not-allowed' : 'pointer'
                      }
                    }, 'Sonraki')
                  )
                ),
                audioUrls.length > 0 && React.createElement('audio', { ref: audioRef, style: { display: 'none' } })
              ),
          React.createElement('button', {
            onClick: onClose,
            style: {
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#757575',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              float: 'right',
            }
          }, 'Kapat')
        )
      )
    );
  };

  window.renderAITeacherModal = (question, studentAnswer, correctAnswer, problemType) => {
    const modalRoot = document.getElementById('ai-teacher-modal-root');
    if (!modalRoot) {
      console.error('Modal root element not found');
      return;
    }

    const handleClose = () => {
      ReactDOM.unmountComponentAtNode(modalRoot);
    };

    ReactDOM.render(
      React.createElement(AITeacherModal, {
        isOpen: true,
        onClose: handleClose,
        question: question,
        studentAnswer: studentAnswer,
        correctAnswer: correctAnswer,
        problemType: problemType
      }),
      modalRoot
    );
  };

  console.log('Geliştirilmiş Etkileşimli AI Öğretmen Modal bileşeni yüklendi');
})(window, document);

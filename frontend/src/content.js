import clubCourtCoffee from './assets/40love-court-coffee.jpeg'
import clubCourtWalkway from './assets/40love-court-walkway.jpeg'
import clubExteriorSunset from './assets/40love-club-exterior-sunset.jpeg'
import clubExteriorDay from './assets/40love-club-exterior-day.jpeg'
import clubCourtsSunset from './assets/40love-courts-sunset.jpeg'
import clubCourtsTerrace from './assets/40love-courts-terrace.jpeg'
import clubLoungeInterior from './assets/40love-lounge-interior.jpeg'

export const FORTYLOVE_CONTENT = {
  brand: {
    name: '40 Love Padel Club & Cafe',
    tagline: 'PADEL CLUB & CAFE',
  },
  contact: {
    address: 'Othman Naseef Street, Dahyet Al-Nakheel, Amman, Jordan',
    addressAr: 'شارع عثمان نصيف، ضاحية النخيل، عمّان، الأردن',
    phone: '0791118877',
    phoneHref: 'tel:+962791118877',
    website: '40love.club',
    hours: { en: 'Every day, 7:00 AM to 3:00 AM', ar: 'يوميًا من ٧ صباحًا حتى ٣ صباحًا' },
    whatsappHref: 'https://wa.me/962791118877',
  },
  hours: { openHour: 7, closeHour: 3 },
  nav: [
    { id: 'courts', en: 'Courts', ar: 'الملاعب' },
    { id: 'pricing', en: 'Pricing', ar: 'الأسعار' },
    { id: 'matchmaking', en: 'Matchmaking', ar: 'المباريات' },
    { id: 'gallery', en: 'Gallery', ar: 'المعرض' },
    { id: 'contact', en: 'Contact', ar: 'تواصل معنا' },
  ],
  hero: {
    eyebrow: { en: 'Amman · Dahyet Al-Nakheel', ar: 'عمّان · ضاحية النخيل' },
    title: { en: 'Your Game.\nYour Court.\nTill 3 AM.', ar: 'لعبتك.\nملعبك.\nحتى ٣ صباحًا.' },
    body: {
      en: "40 Love Padel Club & Cafe is Amman's premium Padel destination, with three floodlit courts, easy online booking, and opening hours from 7 AM until 3 AM.",
      ar: 'نادي 40 Love للبادل والمقهى هو وجهة عمّان المميزة للبادل، ويضم ثلاثة ملاعب مضاءة وحجزًا إلكترونيًا سهلًا وساعات عمل من ٧ صباحًا حتى ٣ صباحًا.',
    },
    primary: { en: 'Book a Court', ar: 'احجز ملعبًا' },
    secondary: { en: 'Explore Courts', ar: 'استكشف الملاعب' },
  },
  stats: [
    { value: 3, suffix: '', en: 'Padel Courts', ar: 'ملاعب بادل' },
    { value: 1, suffix: '', en: 'Sport', ar: 'رياضة' },
    { value: 20, suffix: '', en: 'Hours Open Daily', ar: 'ساعة يوميًا' },
    { value: 7, suffix: '', en: 'Days a Week', ar: 'أيام أسبوعيًا' },
  ],
  courts: [
    {
      key: 'padel',
      count: 3,
      label: { en: 'PADEL', ar: 'بـادل' },
      title: { en: 'Fast rallies.\nBetter nights.', ar: 'تبادلات أسرع.\nليالٍ أفضل.' },
      description: { en: 'Three premium panoramic courts for competitive games, social sessions, and everything in between.', ar: 'ثلاثة ملاعب بانورامية فاخرة للمنافسات والجلسات الاجتماعية وكل ما بينهما.' },
      image: clubCourtWalkway,
      features: { en: ['3 courts', 'Floodlit', 'Premium turf', 'Glass panoramic walls'], ar: ['٣ ملاعب', 'إضاءة ليلية', 'عشب فاخر', 'واجهات زجاجية بانورامية'] },
    },
  ],
  bookingSteps: [
    { number: '01', enTitle: 'Choose your time', arTitle: 'اختر موعدك', en: 'Pick a date and time for your Padel session.', ar: 'اختر التاريخ والوقت لجلسة البادل.' },
    { number: '02', enTitle: 'Pick a time', arTitle: 'اختر الموعد', en: 'Book up to 7 days ahead.', ar: 'احجز حتى 7 أيام مسبقًا.' },
    { number: '03', enTitle: 'Pay securely', arTitle: 'ادفع بأمان', en: 'Simple, secure checkout flow.', ar: 'عملية دفع بسيطة وآمنة.' },
    { number: '04', enTitle: 'Play', arTitle: 'العب', en: 'Show up, warm up, go.', ar: 'احضر، أحمِ نفسك، وابدأ.' },
  ],
  pricing: {
    hours: {
      daytime: {
        en: '7:00 AM — 6:00 PM',
        ar: '٧ صباحًا — ٦ مساءً',
      },
      evening: {
        en: '6:00 PM — 3:00 AM',
        ar: '٦ مساءً — ٣ صباحًا',
      },
    },
    padel: { daytimePrice: 25, daytimeTwoHourPrice: 45, eveningPrice: 35, eveningTwoHourPrice: 60 },
  },
  why: [
    { size: 'large', icon: 'moon', enTitle: 'Play after dark', arTitle: 'العب بعد الغروب', en: 'Floodlit courts and late-night energy until 3 AM.', ar: 'ملاعب مضاءة وطاقة ليلية حتى الساعة ٣ صباحًا.' },
    { size: 'tall', icon: 'clock', enTitle: '20 hours open', arTitle: '٢٠ ساعة مفتوح', en: '7:00 AM to 3:00 AM, every day.', ar: 'من ٧ صباحًا حتى ٣ صباحًا يوميًا.' },
    { size: 'wide', icon: 'calendar', enTitle: 'Recurring slots', arTitle: 'حجوزات متكررة', en: 'Lock in your weekly game time without the back-and-forth.', ar: 'ثبّت موعد لعبك الأسبوعي بسهولة.' },
    { size: 'small', icon: 'spark', enTitle: 'Pro surfaces', arTitle: 'أسطح احترافية', en: 'Built for confident movement and consistent play.', ar: 'مصممة لحركة واثقة وأداء ثابت.' },
    { size: 'small', icon: 'car', enTitle: 'Easy parking', arTitle: 'مواقف سهلة', en: 'A smoother arrival from street to court.', ar: 'وصول أسهل من السيارة إلى الملعب.' },
    { size: 'medium', icon: 'cup', enTitle: 'Café & lounge', arTitle: 'كافيه وصالة', en: 'Stay after the match. Meet the community.', ar: 'ابقَ بعد المباراة والتقِ بالمجتمع.' },
  ],
  gallery: [
    { image: clubCourtWalkway, caption: { en: 'Between courts', ar: 'بين الملاعب' }, position: '50% 54%', alt: 'Walkway between the Padel courts', altAr: 'الممر بين ملاعب البادل' },
    { image: clubCourtsSunset, caption: { en: 'Sunset over the courts', ar: 'الغروب فوق الملاعب' }, position: '50% 56%', alt: 'Aerial view of the blue Padel courts and floodlights at sunset', altAr: 'منظر علوي لملاعب البادل الزرقاء وأعمدة الإضاءة وقت الغروب' },
    { image: clubExteriorDay, caption: { en: 'The club entrance', ar: 'مدخل النادي' }, position: '50% 56%', alt: '40 Love Padel Club exterior in daylight', altAr: 'الواجهة الخارجية لنادي 40 Love نهارًا' },
    { image: clubExteriorSunset, caption: { en: 'The terrace at dusk', ar: 'الشرفة عند الغروب' }, position: '50% 33%', alt: '40 Love club terrace and sign at sunset', altAr: 'شرفة نادي 40 Love واللافتة وقت الغروب' },
    { image: clubCourtsTerrace, caption: { en: 'Tables by court 1', ar: 'طاولات بجانب الملعب ١' }, position: '58% 60%', alt: 'Outdoor terrace with tables and chairs beside court 1 on a sunny day', altAr: 'شرفة خارجية بطاولات وكراسٍ بجانب الملعب رقم ١ في يوم مشمس' },
    { image: clubCourtCoffee, caption: { en: 'Courtside coffee', ar: 'قهوة بجانب الملعب' }, position: '42% 52%', alt: '40 Love coffee beside the Padel court', altAr: 'قهوة 40 Love بجانب ملعب البادل' },
    { image: clubLoungeInterior, caption: { en: 'The café lounge', ar: 'صالة المقهى' }, position: '22% 55%', alt: 'Indoor café lounge with orange chairs under warm pendant lights', altAr: 'صالة المقهى الداخلية بكراسٍ برتقالية تحت إضاءة معلّقة دافئة' },
  ],
  testimonials: [
    { quote: { en: 'The late hours are a game changer. I can actually play after work without rushing.', ar: 'المواعيد الليلية غيّرت اللعبة. أقدر ألعب بعد الدوام بدون استعجال.' }, name: 'Omar K.', role: 'Padel member', rating: 5 },
    { quote: { en: 'Super clean courts, great lighting, and the booking flow is ridiculously easy.', ar: 'الملاعب نظيفة جدًا، الإضاءة ممتازة، والحجز سهل بشكل لا يصدق.' }, name: 'Dana H.', role: 'Padel member', rating: 5 },
    { quote: { en: 'Perfect place for a social night. We came for one game and stayed for three.', ar: 'مكان مثالي لليلة اجتماعية. جئنا لمباراة واحدة وبقينا لثلاث.' }, name: 'Yazan A.', role: 'Community player', rating: 5 },
    { quote: { en: 'It finally feels like Amman has a premium padel club with the right atmosphere.', ar: 'أخيرًا أشعر أن عمّان لديها نادٍ فاخر للبادل بأجواء مميزة.' }, name: 'Lina S.', role: 'Regular member', rating: 5 },
  ],
  events: [
    { tag: { en: 'TOURNAMENTS', ar: 'بطولات' }, title: { en: 'Weekend brackets.', ar: 'بطولات نهاية الأسبوع.' }, body: { en: 'Competitive formats, friendly energy, real bragging rights.', ar: 'منافسات قوية، أجواء ودية، وحق مشروع بالتفاخر.' } },
    { tag: { en: 'COACHING', ar: 'تدريب' }, title: { en: 'Level up.', ar: 'طوّر مستواك.' }, body: { en: 'Private sessions and group coaching for every level.', ar: 'جلسات خاصة وتدريب جماعي لكل المستويات.' } },
    { tag: { en: 'SOCIAL LEAGUES', ar: 'دوريات اجتماعية' }, title: { en: 'Meet your next rival.', ar: 'قابل منافسك القادم.' }, body: { en: 'Weekly leagues designed around community, not just results.', ar: 'دوريات أسبوعية مبنية على المجتمع، وليس النتائج فقط.' } },
  ],
  faq: [
    { q: { en: 'What is the cancellation policy?', ar: 'ما هي سياسة الإلغاء؟' }, a: { en: 'Placeholder policy: cancel or reschedule up to 6 hours before your slot without a fee.', ar: 'سياسة مؤقتة: يمكنك الإلغاء أو إعادة الجدولة حتى 6 ساعات قبل الموعد دون رسوم.' } },
    { q: { en: 'Can I rent equipment?', ar: 'هل تتوفر خدمة استئجار المعدات؟' }, a: { en: 'Yes — placeholder rental options will include rackets, balls, and basic accessories at reception.', ar: 'نعم — ستشمل خيارات الاستئجار المؤقتة مضارب وكرات وإكسسوارات أساسية من الاستقبال.' } },
    { q: { en: 'How far ahead can I book?', ar: 'إلى أي مدى يمكنني الحجز مسبقًا؟' }, a: { en: 'Up to 7 days ahead for standard bookings, with recurring slots available for members.', ar: 'حتى 7 أيام مسبقًا للحجوزات العادية، مع مواعيد متكررة للأعضاء.' } },
    { q: { en: 'How do I pay?', ar: 'كيف يتم الدفع؟' }, a: { en: 'The frontend is ready for secure online payment. The current booking MVP can still use the existing club payment flow.', ar: 'الواجهة جاهزة للدفع الإلكتروني الآمن، ويمكن لنظام الحجز الحالي الاستمرار على آلية الدفع الموجودة في النادي.' } },
    { q: { en: 'What are the opening hours?', ar: 'ما هي ساعات العمل؟' }, a: { en: 'Every day from 7:00 AM until 3:00 AM the following day.', ar: 'يوميًا من الساعة ٧ صباحًا حتى ٣ صباحًا في اليوم التالي.' } },
  ],
}

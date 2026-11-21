import { Link, useOutletContext } from 'react-router-dom'
import './club-information.css'

const documents = {
  en: {
    label: 'Draft for legal review',
    contact: 'Contact the club',
    terms: {
      title: 'Terms of Service',
      introduction: 'This draft covers the member website’s court booking and matchmaking services. It is awaiting legal review.',
      sections: [
        ['Court reservations', 'The booking screen shows the court, session time and price before confirmation. You can view your confirmed reservations in My Bookings.'],
        ['Organised matches', 'Published matches show the session details and price per player. Members can reserve an available place or join the waiting list for a full match.'],
        ['Terms under review', 'Cancellation conditions, refunds, member responsibilities and how to raise a dispute are still under review. Please contact the club with questions about a particular reservation.'],
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      introduction: 'This draft describes the information you enter when using the member website. It is awaiting legal review.',
      sections: [
        ['Member accounts and reservations', 'Members sign in through Clerk. When confirming a court booking, the site asks for a contact number if the member profile has none.'],
        ['Contact messages', 'The contact form asks for a name, phone number and message. It also includes an optional field for your preferred time.'],
        ['Privacy details under review', 'Retention periods, disclosures and how members can make requests about their information still require legal review. Please direct privacy questions to the club.'],
      ],
    },
  },
  ar: {
    label: 'مسودة قيد المراجعة القانونية',
    contact: 'تواصل مع النادي',
    terms: {
      title: 'شروط الخدمة',
      introduction: 'تتناول هذه المسودة خدمات حجز الملاعب والانضمام إلى المباريات عبر موقع الأعضاء، وهي بانتظار المراجعة القانونية.',
      sections: [
        ['حجز الملاعب', 'تعرض صفحة الحجز الملعب وموعد اللعب والسعر قبل تأكيد الحجز. ويمكنك الاطّلاع على حجوزاتك المؤكدة في صفحة «حجوزاتي».'],
        ['المباريات المنظّمة', 'تعرض صفحة المباريات تفاصيل كل مباراة منشورة والسعر لكل لاعب. يمكنك حجز مكان شاغر أو الانضمام إلى قائمة الانتظار عند اكتمال العدد.'],
        ['بنود قيد المراجعة', 'ما زالت شروط الإلغاء واسترداد المبالغ ومسؤوليات الأعضاء وآلية حلّ النزاعات قيد المراجعة. للاستفسار عن حجز معيّن، تواصل مع النادي.'],
      ],
    },
    privacy: {
      title: 'سياسة الخصوصية',
      introduction: 'توضّح هذه المسودة المعلومات التي تُدخلها عند استخدام موقع الأعضاء، وهي بانتظار المراجعة القانونية.',
      sections: [
        ['حسابات الأعضاء والحجوزات', 'يسجّل الأعضاء الدخول عبر خدمة Clerk. وعند تأكيد حجز ملعب، يطلب الموقع رقم هاتف للتواصل إذا لم يكن هناك رقم محفوظ في ملف العضو.'],
        ['رسائل التواصل', 'يطلب نموذج التواصل اسمك ورقم هاتفك ونص رسالتك، ويتضمن أيضًا حقلًا اختياريًا لتحديد الوقت المفضّل.'],
        ['تفاصيل الخصوصية قيد المراجعة', 'ما زالت مدد الاحتفاظ بالبيانات وحالات الإفصاح عنها وآلية تقديم الطلبات المتعلقة بمعلومات الأعضاء بانتظار المراجعة القانونية. للاستفسار عن الخصوصية، تواصل مع النادي.'],
      ],
    },
  },
}

export default function ClubLegal({ kind }) {
  const { locale } = useOutletContext()
  const t = documents[locale] || documents.en
  const document = t[kind]

  return (
    <article className="club-legal">
      <header>
        <p className="club-legal-status">{t.label}</p>
        <h1>{document.title}</h1>
        <p>{document.introduction}</p>
      </header>
      {document.sections.map(([title, body]) => (
        <section key={title}>
          <h2>{title}</h2>
          <p>{body}</p>
        </section>
      ))}
      <Link className="club-legal-contact" to="/contact">{t.contact}</Link>
    </article>
  )
}

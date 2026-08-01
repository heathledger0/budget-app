import type { CategoryDef, SectionType } from '../types';

export const SECTION_LABELS: Record<SectionType, string> = {
  income: '수입',
  fixed: '고정지출',
  saving: '저축/투자',
  variable: '변동지출',
};

export const SECTION_EMOJI: Record<SectionType, string> = {
  income: '💰',
  fixed: '📌',
  saving: '🏦',
  variable: '🛒',
};

export const SECTION_ORDER: SectionType[] = ['income', 'fixed', 'saving', 'variable'];

export const CATEGORIES: CategoryDef[] = [
  // 수입
  { id: 'carryover', name: '이월금', section: 'income', emoji: '🔄' },
  { id: 'salary', name: '월급', section: 'income', emoji: '💰' },
  { id: 'sideIncome', name: '부수입', section: 'income', emoji: '💵' },
  { id: 'allowance', name: '용돈', section: 'income', emoji: '👛' },
  { id: 'interest', name: '이자', section: 'income', emoji: '🏦' },
  { id: 'insuranceRefund', name: '보험/환급/적금만기', section: 'income', emoji: '🎁' },
  { id: 'etcIncome', name: '기타', section: 'income', emoji: '➕' },

  // 고정지출
  { id: 'loanInterest', name: '대출이자', section: 'fixed', emoji: '🏠' },
  { id: 'telecom', name: '통신비', section: 'fixed', emoji: '📱' },
  { id: 'healthInsurance', name: '실손보험', section: 'fixed', emoji: '🏥' },
  { id: 'carInsurance', name: '자동차보험', section: 'fixed', emoji: '🚗' },
  { id: 'driverInsurance', name: '운전자보험', section: 'fixed', emoji: '🚙' },
  { id: 'subscription', name: '구독서비스', section: 'fixed', emoji: '📺' },
  { id: 'membershipFee', name: '회비', section: 'fixed', emoji: '🎫' },
  { id: 'donation', name: '헌금', section: 'fixed', emoji: '⛪' },
  { id: 'utilities', name: '공과금 및 기타', section: 'fixed', emoji: '💡' },

  // 저축/투자
  { id: 'housingSubscription', name: '주택청약', section: 'saving', emoji: '🏘️' },
  { id: 'installmentSaving', name: '적금', section: 'saving', emoji: '🐷' },
  { id: 'weddingSaving', name: '웨딩적금', section: 'saving', emoji: '💍' },
  { id: 'pensionFund', name: '연금저축펀드', section: 'saving', emoji: '👴' },
  { id: 'emergencyFund', name: '비상금저축', section: 'saving', emoji: '🆘' },
  { id: 'domesticInvest', name: '국내투자', section: 'saving', emoji: '📈' },
  { id: 'overseasInvest', name: '해외투자', section: 'saving', emoji: '🌍' },

  // 변동지출
  { id: 'tax', name: '세금', section: 'variable', emoji: '🧾' },
  { id: 'food', name: '식비', section: 'variable', emoji: '🍚' },
  { id: 'cafe', name: '카페', section: 'variable', emoji: '☕' },
  { id: 'daily', name: '생필품', section: 'variable', emoji: '🧴' },
  { id: 'events', name: '경조사비', section: 'variable', emoji: '💐' },
  { id: 'transport', name: '교통비', section: 'variable', emoji: '🚌' },
  { id: 'clothing', name: '의류/미용', section: 'variable', emoji: '👗' },
  { id: 'medical', name: '의료비', section: 'variable', emoji: '💊' },
  { id: 'cardBill', name: '카드대금', section: 'variable', emoji: '💳' },
  { id: 'etcVariable', name: '기타', section: 'variable', emoji: '🔖' },
  { id: 'parents', name: '부모님', section: 'variable', emoji: '👨‍👩‍👧' },
];

export function categoriesBySection(section: SectionType): CategoryDef[] {
  return CATEGORIES.filter((c) => c.section === section);
}

export function categoryById(id: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

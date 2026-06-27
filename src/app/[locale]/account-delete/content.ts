import type { LegalDoc } from "@/components/legal-page";

const en: LegalDoc = {
  title: "Delete Your Account",
  updated: "Last updated: June 12, 2026",
  intro: [
    "You can permanently delete your HelaVoice account and all data associated with it at any time. Deletion is immediate and cannot be undone.",
  ],
  sections: [
    {
      heading: "Delete from the mobile app",
      body: [
        "Open the HelaVoice app, go to the Profile tab, and tap \"Delete Account\". After you confirm, your account is deleted immediately.",
      ],
    },
    {
      heading: "Delete by email",
      body: [
        "If you no longer have the app installed, email hi@helavoice.lk from the email address on your account with the subject \"Delete my account\". We will complete the deletion within 7 days and confirm by reply.",
      ],
    },
    {
      heading: "What gets deleted",
      body: [
        "Your account and sign-in details, all transcriptions and translations, your credit balance and purchase history records. Unused credits are forfeited and cannot be refunded once the account is deleted.",
        "Residual copies in encrypted backups are purged within 30 days. Payment records held by Stripe or Apple are retained by those providers as required for financial compliance.",
      ],
    },
  ],
};

const si: LegalDoc = {
  title: "ඔබගේ ගිණුම මකන්න",
  updated: "අවසන් යාවත්කාලීනය: 2026 ජුනි 12",
  intro: [
    "ඔබට ඕනෑම වේලාවක ඔබගේ HelaVoice ගිණුම සහ ඊට අදාළ සියලු දත්ත ස්ථිරවම මැකිය හැකිය. මැකීම ක්ෂණිකව සිදුවන අතර අහෝසි කළ නොහැක.",
  ],
  sections: [
    {
      heading: "ජංගම යෙදුමෙන් මැකීම",
      body: [
        "HelaVoice යෙදුම විවෘත කර, පැතිකඩ (Profile) පටිත්තට ගොස්, \"ගිණුම මකන්න\" ඔබන්න. තහවුරු කළ පසු ඔබගේ ගිණුම ක්ෂණිකව මැකේ.",
      ],
    },
    {
      heading: "විද්‍යුත් තැපෑලෙන් මැකීම",
      body: [
        "යෙදුම ස්ථාපනය කර නොමැති නම්, ඔබගේ ගිණුමේ විද්‍යුත් තැපැල් ලිපිනයෙන් \"Delete my account\" යන මාතෘකාව සමඟ hi@helavoice.lk වෙත ලියන්න. දින 7ක් ඇතුළත මැකීම සම්පූර්ණ කර පිළිතුරෙන් තහවුරු කරමු.",
      ],
    },
    {
      heading: "මැකෙන දේ",
      body: [
        "ඔබගේ ගිණුම සහ පුරනය වීමේ විස්තර, සියලු පිටපත් සහ පරිවර්තන, ක්‍රෙඩිට් ශේෂය සහ මිලදී ගැනීම් ඉතිහාසය. ගිණුම මැකූ පසු ඉතිරි ක්‍රෙඩිට් අහිමි වන අතර ආපසු ගෙවිය නොහැක.",
        "සංකේතිත උපස්ථවල ඉතිරි පිටපත් දින 30ක් ඇතුළත ඉවත් කෙරේ. Stripe හෝ Apple සතු ගෙවීම් වාර්තා මූල්‍ය නීති අනුව එම ආයතන විසින් රඳවා තබා ගැනේ.",
      ],
    },
  ],
};

export const accountDeleteContent: Record<string, LegalDoc> = { en, si };

(function () {
  const section = Array.from(document.querySelectorAll('section')).find((item) =>
    item.querySelector('h2')?.textContent.trim() === 'Sana kalan çıktılar'
  );
  if (!section) return;

  section.id = 'sana-kalan-ciktilar';
  section.setAttribute('aria-labelledby', 'landing-heading-sana-kalan-ciktilar');
  section.className = 'landing-lower-section w-full border-t border-[#E9E4F5] bg-[#FAF8FF] py-16 md:py-20';
  section.innerHTML = `
    <div class="landing-section-container">
      <div class="landing-section-heading">
        <div class="landing-section-eyebrow">
          <span class="landing-section-rule" aria-hidden="true"></span>
          <span>Süreç Çıktıları</span>
        </div>
        <h2 id="landing-heading-sana-kalan-ciktilar" class="text-2xl md:text-3xl font-bold text-[#1E1B4B]">Sana kalan çıktılar</h2>
        <p class="text-sm text-[#6B7280] mt-1">Hepsi senin hikâyenden türetilir.</p>
      </div>
      <div class="landing-output-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <article class="landing-output-card bg-white rounded-xl border border-[#E9E4F5] p-7 flex flex-col justify-between shadow-elevation-card hover:shadow-elevation-hover transition-all duration-200 hover:border-[#7E3AF2]">
          <div>
            <div class="micro-document bg-[#F5F2FF] border border-[#DDD6FE] border-t-2 border-t-[#7E3AF2] rounded-lg p-4 mb-5 text-[11px] leading-relaxed text-[#4B5563]">
              <div class="micro-document-header border-b border-[#DDD6FE]/70 pb-2.5 mb-2.5">
                <span class="micro-document-label text-[10px] font-bold tracking-[0.08em] text-[#7E3AF2] uppercase">
                  <span class="micro-document-dot"></span>
                  A4 Belge Taslağı
                </span>
                <span class="micro-document-meta">
                  <span class="micro-document-status">PDF · Taslak</span>
                  <span class="micro-document-example">Örnek</span>
                </span>
              </div>
              <p class="italic text-[#1E1B4B]/85 line-clamp-4">“Satış ve iş geliştirme alanındaki kariyer yolculuğuma Hepsiburada’da başladım. Ardından Trendyol Group’ta kıdemli satış uzmanı olarak görev aldım...”</p>
            </div>
            <h3 class="text-base font-semibold tracking-[-0.015em] text-[#1E1B4B]">Satış hikâyen</h3>
            <p class="text-xs text-[#6B7280] mt-1 leading-normal">150-250 kelime, senin sesinle</p>
          </div>
        </article>
        <article class="landing-output-card bg-white rounded-xl border border-[#E9E4F5] p-7 flex flex-col justify-between shadow-elevation-card hover:shadow-elevation-hover transition-all duration-200 hover:border-[#7E3AF2]">
          <div>
            <div class="micro-document bg-[#F5F2FF] border border-[#DDD6FE] border-t-2 border-t-[#7E3AF2] rounded-lg p-4 mb-5 text-[11px] leading-relaxed text-[#4B5563]">
              <div class="micro-document-header border-b border-[#DDD6FE]/70 pb-2.5 mb-2.5">
                <span class="micro-document-label text-[10px] font-bold tracking-[0.08em] text-[#7E3AF2] uppercase">
                  <span class="micro-document-dot"></span>
                  Kısa tanıtım
                </span>
                <span class="micro-document-meta">
                  <span class="micro-document-status">Özet taslağı</span>
                  <span class="micro-document-example">Örnek</span>
                </span>
              </div>
              <p class="italic text-[#1E1B4B]/85 line-clamp-4">“Satış ve iş geliştirme alanında Hepsiburada’da başladım, Trendyol Group’ta kıdemli satış uzmanı olarak devam ettim...”</p>
            </div>
            <h3 class="text-base font-semibold tracking-[-0.015em] text-[#1E1B4B]">Kısa özet</h3>
            <p class="text-xs text-[#6B7280] mt-1 leading-normal">Networking için 3-4 cümle</p>
          </div>
        </article>
        <article class="landing-output-card bg-white rounded-xl border border-[#E9E4F5] p-7 flex flex-col justify-between shadow-elevation-card hover:shadow-elevation-hover transition-all duration-200 hover:border-[#7E3AF2]">
          <div>
            <div class="micro-document bg-[#F5F2FF] border border-[#DDD6FE] border-t-2 border-t-[#7E3AF2] rounded-lg p-4 mb-5 text-[11px] leading-relaxed text-[#4B5563]">
              <div class="micro-document-header border-b border-[#DDD6FE]/70 pb-2.5 mb-2.5">
                <span class="micro-document-label text-[10px] font-bold tracking-[0.08em] text-[#7E3AF2]">
                  <span class="micro-document-dot"></span>
                  S: Kariyer hedefin nedir?
                </span>
                <span class="micro-document-meta">
                  <span class="micro-document-status">Mülakat taslağı</span>
                  <span class="micro-document-example">Örnek</span>
                </span>
              </div>
              <p class="italic text-[#1E1B4B]/85 line-clamp-4">“B2B SaaS tarafında kıdemli satış yöneticisi olarak, kurumsal müşterilerin büyüme hedeflerine doğrudan katkı sağlamak istiyorum.”</p>
            </div>
            <h3 class="text-base font-semibold tracking-[-0.015em] text-[#1E1B4B]">Mülakat cevapları</h3>
            <p class="text-xs text-[#6B7280] mt-1 leading-normal">2-3 soru için taslak</p>
          </div>
        </article>
        <article class="landing-output-card bg-white rounded-xl border border-[#E9E4F5] p-7 flex flex-col justify-between shadow-elevation-card hover:shadow-elevation-hover transition-all duration-200 hover:border-[#7E3AF2]">
          <div>
            <div class="micro-document bg-[#F5F2FF] border border-[#DDD6FE] border-t-2 border-t-[#7E3AF2] rounded-lg p-4 mb-5 text-[11px] leading-relaxed text-[#4B5563]">
              <div class="micro-document-header border-b border-[#DDD6FE]/70 pb-2.5 mb-2.5">
                <span class="micro-document-label text-[10px] font-bold tracking-[0.08em] text-[#7E3AF2] uppercase">
                  <span class="micro-document-dot"></span>
                  Özgeçmiş Üst Özeti
                </span>
                <span class="micro-document-meta">
                  <span class="micro-document-status">CV taslağı</span>
                  <span class="micro-document-example">Örnek</span>
                </span>
              </div>
              <p class="italic text-[#1E1B4B]/85 line-clamp-4">“Hepsiburada’da satış ve iş geliştirme ile başlayan, Trendyol Group’ta kıdemli satış uzmanlığıyla devam eden deneyim...”</p>
            </div>
            <h3 class="text-base font-semibold tracking-[-0.015em] text-[#1E1B4B]">CV özet paragrafı</h3>
            <p class="text-xs text-[#6B7280] mt-1 leading-normal">3-4 satır</p>
          </div>
        </article>
      </div>
    </div>`;
})();

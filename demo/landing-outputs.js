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
        <h2 id="landing-heading-sana-kalan-ciktilar" class="text-2xl md:text-3xl font-bold text-[var(--color-ink)]">Sana kalan çıktılar</h2>
        <p class="text-sm text-[#6B7280] mt-1">Hepsi senin hikâyenden türetilir.</p>
      </div>
      <div class="landing-output-grid grid grid-cols-1 md:grid-cols-2 gap-5">
        <article class="landing-output-card bg-white rounded-xl border border-[#E9E4F5] p-7 flex flex-col justify-between shadow-elevation-card hover:shadow-elevation-hover transition-all duration-200 hover:border-[#7E3AF2]">
          <div>
            <div class="micro-document border border-[#DDD6FE] border-t-2 border-t-[#7E3AF2] rounded-lg p-4 mb-5 text-[11px] leading-relaxed text-[#4B5563]">
              <div class="micro-document-header border-b border-[#DDD6FE]/70 pb-2.5 mb-2.5">
                <span class="micro-document-label text-base font-bold tracking-[0.08em] text-[var(--color-accent)]">
                  <span class="micro-document-dot"></span>
                  A4 Belge Taslağı
                </span>
                <span class="micro-document-meta">
                  <span class="micro-document-status">PDF · Taslak</span>
                  <button class="micro-document-example" type="button" aria-expanded="false">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
                    <span>Örnek</span>
                  </button>
                  <span class="micro-document-example-note" hidden>Kurgusal içerik; gerçek kullanıcı verisi değildir.</span>
                </span>
              </div>
              <p class="italic text-[var(--color-ink)]">“Kariyerime satış alanında başladım. Zamanla müşteri ihtiyaçlarını anlamaya ve çözüm üretmeye odaklandım.”</p>
            </div>
            <h3 class="text-base font-semibold tracking-[-0.015em] text-[var(--color-ink)]">Satış hikâyen</h3>
            <p class="text-base text-[var(--color-ink-2)] mt-1 leading-normal">150-250 kelime, senin sesinle</p>
          </div>
        </article>
        <article class="landing-output-card bg-white rounded-xl border border-[#E9E4F5] p-7 flex flex-col justify-between shadow-elevation-card hover:shadow-elevation-hover transition-all duration-200 hover:border-[#7E3AF2]">
          <div>
            <div class="micro-document border border-[#DDD6FE] border-t-2 border-t-[#7E3AF2] rounded-lg p-4 mb-5 text-[11px] leading-relaxed text-[#4B5563]">
              <div class="micro-document-header border-b border-[#DDD6FE]/70 pb-2.5 mb-2.5">
                <span class="micro-document-label text-base font-bold tracking-[0.08em] text-[var(--color-accent)]">
                  <span class="micro-document-dot"></span>
                  Kısa tanıtım
                </span>
                <span class="micro-document-meta">
                  <span class="micro-document-status">Özet taslağı</span>
                  <button class="micro-document-example" type="button" aria-expanded="false">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
                    <span>Örnek</span>
                  </button>
                  <span class="micro-document-example-note" hidden>Kurgusal içerik; gerçek kullanıcı verisi değildir.</span>
                </span>
              </div>
              <p class="italic text-[var(--color-ink)]">“Satış ve iş geliştirme alanındaki deneyimimle müşteri ihtiyaçlarını anlamaya ve ekip hedeflerine katkı sunmaya odaklanıyorum.”</p>
            </div>
            <h3 class="text-base font-semibold tracking-[-0.015em] text-[var(--color-ink)]">Kısa özet</h3>
            <p class="text-base text-[var(--color-ink-2)] mt-1 leading-normal">Networking için 3-4 cümle</p>
          </div>
        </article>
        <article class="landing-output-card bg-white rounded-xl border border-[#E9E4F5] p-7 flex flex-col justify-between shadow-elevation-card hover:shadow-elevation-hover transition-all duration-200 hover:border-[#7E3AF2]">
          <div>
            <div class="micro-document border border-[#DDD6FE] border-t-2 border-t-[#7E3AF2] rounded-lg p-4 mb-5 text-[11px] leading-relaxed text-[#4B5563]">
              <div class="micro-document-header border-b border-[#DDD6FE]/70 pb-2.5 mb-2.5">
                <span class="micro-document-label text-base font-bold tracking-[0.08em] text-[var(--color-accent)]">
                  <span class="micro-document-dot"></span>
                  S: Kariyer hedefin nedir?
                </span>
                <span class="micro-document-meta">
                  <span class="micro-document-status">Mülakat taslağı</span>
                  <button class="micro-document-example" type="button" aria-expanded="false">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
                    <span>Örnek</span>
                  </button>
                  <span class="micro-document-example-note" hidden>Kurgusal içerik; gerçek kullanıcı verisi değildir.</span>
                </span>
              </div>
              <p class="italic text-[var(--color-ink)]">“Satış alanındaki deneyimimi kullanarak müşteri ihtiyaçlarına uygun çözümler geliştirmek ve ekip hedeflerine katkı sunmak istiyorum.”</p>
            </div>
            <h3 class="text-base font-semibold tracking-[-0.015em] text-[var(--color-ink)]">Mülakat cevapları</h3>
            <p class="text-base text-[var(--color-ink-2)] mt-1 leading-normal">2-3 soru için taslak</p>
          </div>
        </article>
        <article class="landing-output-card bg-white rounded-xl border border-[#E9E4F5] p-7 flex flex-col justify-between shadow-elevation-card hover:shadow-elevation-hover transition-all duration-200 hover:border-[#7E3AF2]">
          <div>
            <div class="micro-document border border-[#DDD6FE] border-t-2 border-t-[#7E3AF2] rounded-lg p-4 mb-5 text-[11px] leading-relaxed text-[#4B5563]">
              <div class="micro-document-header border-b border-[#DDD6FE]/70 pb-2.5 mb-2.5">
                <span class="micro-document-label text-base font-bold tracking-[0.08em] text-[var(--color-accent)]">
                  <span class="micro-document-dot"></span>
                  Özgeçmiş Üst Özeti
                </span>
                <span class="micro-document-meta">
                  <span class="micro-document-status">CV taslağı</span>
                  <button class="micro-document-example" type="button" aria-expanded="false">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
                    <span>Örnek</span>
                  </button>
                  <span class="micro-document-example-note" hidden>Kurgusal içerik; gerçek kullanıcı verisi değildir.</span>
                </span>
              </div>
              <p class="italic text-[var(--color-ink)]">“Satış ve iş geliştirme alanındaki deneyimim, müşteri ihtiyaçlarını anlayıp uygulanabilir çözümler geliştirmeye dayanıyor.”</p>
            </div>
            <h3 class="text-base font-semibold tracking-[-0.015em] text-[var(--color-ink)]">CV özet paragrafı</h3>
            <p class="text-base text-[var(--color-ink-2)] mt-1 leading-normal">3-4 satır</p>
          </div>
        </article>
      </div>
      <p class="landing-output-note">Kartlardaki içerikler kurgusaldır; gerçek kullanıcı verisi değildir.</p>
    </div>`;
})();

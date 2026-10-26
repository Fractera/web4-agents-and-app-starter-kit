import { slotHasGroups } from "@/lib/menu/group-menus";
import { DrawerToggle } from "@/components/menu/shared/drawer-toggle.client";
import { topMenuUi } from "@/components/menu/top/top-menu.i18n";
import { ProjectHeader } from "@/components/shell/project-header";
import { AllProjects } from "@/components/architect/all-projects.client";
import { coreShellData } from "@/lib/shell/core-shell-data";

// ШАПКА СТРАНИЦ АРХИТЕКТОРА — СВОЯ (узел, шаг 553). Вид — `components/shell/` (копия сайта байт в байт, `npm run shell-kit:add`,
// сторож `check:shell-kits`); данные — `lib/shell/core-shell-data.ts`: имя и логотип ядра, «Все проекты» (островок после логотипа),
// «Мой аккаунт» с оранжевой точкой. Меню проекта из CONFIG здесь не показывается. Своё у ядра — ещё кнопки ящиков слева/справа.
// 🪦 285-3 «шапка ядра = шапка проекта» снята шагом 553 (владелец 2026-10-21: «я бы предпочёл иметь собственное меню для страницы
// архитектора»). Прежний текст — git history этого файла.
export function TopMenu({ lang }: { lang: string }) {
  const data = coreShellData(lang);
  const ui = topMenuUi(lang);
  const leftHas = slotHasGroups("left", lang);
  const rightHas = slotHasGroups("right", lang);
  return (
    <ProjectHeader
      data={data}
      // 356-1: только ядро знает, что ждёт архитектора, — открытые терминалы и готовые предпросмотры.
      surface={{ attentionUrl: `/api/node/attention?lang=${lang}`, attentionWords: ui.attention }}
      navSlot={<AllProjects lang={lang} nativeLabel={ui.nativeElements} customLabel={ui.customElements} menuLabel={ui.menu} />}
      leftSlot={leftHas ? <DrawerToggle side="left" labels={{ open: ui.openLeft, close: ui.closeLeft }} /> : undefined}
      rightSlot={rightHas ? <DrawerToggle side="right" labels={{ open: ui.openRight, close: ui.closeRight }} /> : undefined}
    />
  );
}

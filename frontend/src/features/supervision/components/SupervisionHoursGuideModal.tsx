import { useState, type ReactNode } from 'react';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { ModalShell } from '@/components/ModalShell';

type SupervisionHoursGuideModalProps = {
  onClose: () => void;
  onHidePermanently: () => void;
};

export function SupervisionHoursGuideModal({
  onClose,
  onHidePermanently,
}: SupervisionHoursGuideModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const close = () => {
    if (dontShowAgain) {
      onHidePermanently();
      return;
    }

    onClose();
  };

  return (
    <ModalShell
      onClose={close}
      ariaLabelledBy="supervision-hours-guide-title"
      closeOnBackdrop={false}
      dialogClassName="relative max-h-[90vh] w-full max-w-[760px] overflow-y-auto rounded-[16px] bg-white px-5 pb-5 pt-4 text-[#1F305E] shadow-[0_16px_40px_rgba(0,0,0,0.24)] sm:px-7 sm:pb-7"
    >
      <ModalCloseButton onClick={close} iconClassName="h-6 w-6" />

      <h2
        id="supervision-hours-guide-title"
        className="pr-9 text-center text-[22px] font-extrabold leading-tight sm:text-[24px]"
      >
        Как правильно внести часы
      </h2>

      <ol className="mt-6 space-y-4 text-[14px] leading-[1.55]">
        <GuideStep title="Как часы практики становятся часами супервизии">
          <p>
            Часы практики подтверждает супервизор. После подтверждения они автоматически
            пересчитываются в часы супервизии: для уровней Инструктор и Куратор 30 часов практики
            дают 1 час супервизии, для уровня Супервизор 20 часов практики дают 1 час супервизии.
          </p>
          <p className="mt-2">
            Если часов практики пока меньше нужного минимума, они сохраняются в личном кабинете и
            будут засчитаны в супервизию, когда накопится 20 или 30 часов в зависимости от уровня.
          </p>
        </GuideStep>

        <GuideStep title="Укажите период практики">
          <p>
            Внесите дату начала и дату окончания периода, за который вы подаете часы. Можно
            указывать только уже прошедшую практику. Даты из будущего система не примет.
          </p>
        </GuideStep>

        <GuideStep title="Заполните условия практики">
          <p>
            В поле <strong>Условия практики</strong> кратко напишите, где или в каком формате
            проходила практика: центр, проект, клиентская работа, школа, организация или другой
            понятный контекст.
          </p>
        </GuideStep>

        <GuideStep title="Разделите часы практики">
          <p>
            В форме есть два типа практики: <strong>Полевая практика</strong> и{' '}
            <strong>Работа с информацией</strong>. Общее количество часов практики считается как
            сумма этих двух полей.
          </p>
          <p className="mt-2">
            Каждый тип должен быть{' '}
            <strong>не меньше 40% от общего количества часов практики</strong>. Например, если
            всего вы вносите 100 часов практики, то полевая практика должна быть не меньше 40
            часов, и работа с информацией тоже должна быть не меньше 40 часов.
          </p>
          <p className="mt-2">
            Оставшиеся 20% можно добавить к любому из двух типов: например 60/40, 50/50 или 40/60.
          </p>
        </GuideStep>

        <GuideStep title="Подтвердите практику">
          <p>
            После заполнения левой части нажмите <strong>Подтвердить практику</strong>. Форма
            посчитает общее количество практики и расчетные часы супервизии. После этого откроется
            правая часть формы.
          </p>
        </GuideStep>

        <GuideStep title="Распределите часы супервизии">
          <p>
            Справа нужно распределить расчетные часы супервизии по полям с наблюдением, без
            наблюдения, индивидуально и в группе. Сумма всех распределенных часов должна точно
            совпадать с расчетной супервизией.
          </p>
          <p className="mt-2">
            Часов <strong>В группе</strong> может быть не больше 50% от всей супервизии. При этом
            100% супервизии можно указать как индивидуальную.
          </p>
        </GuideStep>

        <GuideStep title="Укажите супервизора">
          <p>
            Начните вводить ФИО или email супервизора. Если супервизор есть в системе, появится
            подсказка. Если вашего супервизора нет в системе, напишите{' '}
            <a href="mailto:cspap@yandex.ru" className="text-blue-dark underline">
              cspap@yandex.ru
            </a>
            .
          </p>
        </GuideStep>

        <GuideStep title="Подтвердите этические принципы и отправьте">
          <p>
            Перед отправкой отметьте чекбокс об ознакомлении с этическими принципами IBAO. Кнопка{' '}
            <strong>Отправить</strong> станет доступной, когда все обязательные поля заполнены
            правильно.
          </p>
        </GuideStep>
      </ol>

      <div className="mt-5 rounded-[12px] bg-[#E7F1F4] px-4 py-3 text-[14px] leading-[1.45]">
        <strong>Важно:</strong> если система не дает отправить заявку, проверьте баланс полевой
        практики и работы с информацией, сумму распределенной супервизии, лимит групповых часов и
        выбранного супервизора.
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-3 text-[14px] text-[#6B7894]">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
            className="h-5 w-5 rounded border-[#A7B1C7]"
          />
          <span>Больше не показывать</span>
        </label>

        <button
          type="button"
          onClick={close}
          className="btn btn-dark h-[46px] rounded-[10px] px-8 text-[15px] font-extrabold"
        >
          Понятно
        </button>
      </div>
    </ModalShell>
  );
}

function GuideStep({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="rounded-[12px] border border-[#DCE8EC] bg-white px-4 py-3">
      <h3 className="mb-1 text-[15px] font-extrabold">{title}</h3>
      <div className="text-[#26396E]">{children}</div>
    </li>
  );
}

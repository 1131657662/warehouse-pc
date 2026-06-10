import type { ModalFuncProps } from 'antd';

type ConfirmHandle = {
  update: (config: ModalFuncProps) => void;
  destroy: () => void;
};

type CountdownConfirmOptions = ModalFuncProps & {
  confirm: (config: ModalFuncProps) => ConfirmHandle;
  seconds?: number;
};

export function showCountdownConfirm(options: CountdownConfirmOptions) {
  const {
    confirm,
    seconds = 3,
    okText = '确认',
    okButtonProps,
    onCancel,
    onOk,
    ...rest
  } = options;
  let remain = seconds;
  let timer: ReturnType<typeof setInterval> | undefined;

  const clearTimer = () => {
    if (timer) clearInterval(timer);
    timer = undefined;
  };

  const modal = confirm({
    ...rest,
    okText: `${okText} (${remain}s)`,
    okButtonProps: { ...okButtonProps, disabled: true },
    onCancel: (...args) => {
      clearTimer();
      onCancel?.(...args);
    },
    onOk: async (...args) => {
      clearTimer();
      return onOk?.(...args);
    },
  });

  timer = setInterval(() => {
    remain -= 1;
    if (remain <= 0) {
      clearTimer();
      modal.update({
        okText,
        okButtonProps: { ...okButtonProps, disabled: false },
      });
      return;
    }
    modal.update({
      okText: `${okText} (${remain}s)`,
      okButtonProps: { ...okButtonProps, disabled: true },
    });
  }, 1000);

  return modal;
}

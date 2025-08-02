// src/features/common/resizer.ts
import type { AppController } from '../../AppController';
import logger from '../../utils/logger';

const PX_PER_VH_DRAG_SENSITIVITY = 10;

let isResizing = false;
let initialMouseX: number | null = null;
let initialUserPreferredVh: number | null = null;
let appControllerInstance: AppController | null = null;

function onMouseMove(event: MouseEvent | TouchEvent) {
    if (!isResizing || initialMouseX === null || initialUserPreferredVh === null || !appControllerInstance) return;
    event.preventDefault();
    const clientX = (event as TouchEvent).touches ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
    const deltaX = clientX - initialMouseX;
    const deltaVh = deltaX / PX_PER_VH_DRAG_SENSITIVITY;
    appControllerInstance.setUserPreferredBoardSizeVh(initialUserPreferredVh + deltaVh);
}

function onMouseUp() {
    if (!isResizing) return;
    isResizing = false;
    document.body.classList.remove('board-resizing');
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('touchmove', onMouseMove);
    document.removeEventListener('touchend', onMouseUp);
    logger.debug('[Resizer] Resize ended.');
    initialMouseX = null;
    initialUserPreferredVh = null;
    appControllerInstance = null;
}

export function initializeResizer(handleEl: HTMLElement, controller: AppController) {
    const onMouseDown = (event: MouseEvent | TouchEvent) => {
        event.preventDefault();
        event.stopPropagation();
        isResizing = true;
        appControllerInstance = controller;
        document.body.classList.add('board-resizing');
        
        const clientX = (event as TouchEvent).touches ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
        initialMouseX = clientX;
        initialUserPreferredVh = controller.getUserPreferredBoardSizeVh();
        
        document.addEventListener('mousemove', onMouseMove, { passive: false });
        document.addEventListener('mouseup', onMouseUp, { once: true });
        document.addEventListener('touchmove', onMouseMove, { passive: false });
        document.addEventListener('touchend', onMouseUp, { once: true });
        logger.debug('[Resizer] Resize started.');
    };

    handleEl.addEventListener('mousedown', onMouseDown as EventListener);
    handleEl.addEventListener('touchstart', onMouseDown as EventListener);

    // Возвращаем функцию для очистки, которую можно будет вызвать в хуке destroy
    return () => {
        handleEl.removeEventListener('mousedown', onMouseDown as EventListener);
        handleEl.removeEventListener('touchstart', onMouseDown as EventListener);
        // Дополнительная очистка на случай, если ресайз не завершился
        if (isResizing) {
            onMouseUp();
        }
    };
}

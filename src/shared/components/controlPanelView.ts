// src/shared/components/controlPanelView.ts
import { h, VNode } from 'snabbdom';
import type { AppController } from '../../AppController';
import type { EngineId } from '../../core/gameplay.service';

// Тип обработчика клика изменен для возможности остановки события
type OnClickHandler = (e: Event) => void;

function renderControlButton(iconName: string, title: string, disabled: boolean, onClick: OnClickHandler): VNode {
    return h('button.control-panel__button', {
        attrs: { 
            disabled,
            title
        },
        on: { click: onClick }
    }, [
        h('img', { props: { src: `/buttons/${iconName}.svg` } })
    ]);
}

// Функция рендеринга элемента управления движком
function renderEngineControl(controller: AppController): VNode {
    const { selectedEngine, engineSelectorOpen } = controller.state;
    const engineOptions: { id: EngineId, text: string }[] = [
        { id: 'SF_2200', text: 'Rbleipzig 2200+'},
        { id: 'SF_2100', text: 'Krokodil 2100+'},
        { id: 'SF_1900', text: 'Karde 2000+'},
        { id: 'MOZER_1900+', text: 'MoZeR 1900+'},
        { id: 'SF_1700', text: 'Dimas 1800+'},
        { id: 'SF_1600', text: 'Darko 1700+'},
    ];

    // Выпадающий список рендерится только если engineSelectorOpen === true
    const selectDropdown = engineSelectorOpen ? h('select.engine-select-dropdown', {
        on: {
            change: (e: Event) => {
                const target = e.target as HTMLSelectElement;
                controller.setEngine(target.value as EngineId);
                controller.toggleEngineSelector(); // Закрываем после выбора
            },
            click: (e: Event) => e.stopPropagation() // Предотвращаем закрытие по клику на сам select
        }
    }, engineOptions.map(opt => 
        h('option', {
            props: { value: opt.id, selected: selectedEngine === opt.id }
        }, opt.text)
    )) : null;

    return h('div.engine-control-container', [
        renderControlButton('robot', 'Select Engine', false, (e: Event) => {
            e.stopPropagation(); // Останавливаем событие, чтобы не закрыть меню сразу
            controller.toggleEngineSelector();
        }),
        selectDropdown
    ]);
}

export function renderControlPanel(controller: AppController): VNode | null {
    const controls = controller.state.currentGameControls;
    if (!controls) return null;

    return h('div.control-panel-container', [
        renderControlButton('new', 'New', !controls.canRequestNew, () => controls.onRequestNew()),
        renderControlButton('restart', 'Restart', !controls.canRestart, () => controls.onRestart()),
        renderControlButton('resign', 'Resign', !controls.canResign, () => controls.onResign()),
        renderControlButton('link', 'Share', false, () => controls.onShare()),
        renderEngineControl(controller),
        renderControlButton('exit', 'Exit', false, () => controls.onExit()),
    ]);
}

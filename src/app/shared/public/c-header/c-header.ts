import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';

@Component({
  selector: 'app-c-header',
  imports: [],
  templateUrl: './c-header.html',
  styleUrl: './c-header.css',
})
export class CHeader {
  menuOpen = false;

  // Получаем ссылку именно на блок с меню из HTML
  @ViewChild('menuBlock') menuBlock!: ElementRef;

  // Метод для кнопки бургера
  toggleMenu(event: MouseEvent): void {
    event.stopPropagation(); // Не даем событию всплыть до document
    this.menuOpen = !this.menuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Если меню и так закрыто, ничего не делаем
    if (!this.menuOpen) return;

    const target = event.target as HTMLElement;

    // 1. Проверяем, кликнули ли по конкретному пункту меню (ссылке)
    const clickedOnMenuItem = target.closest('.menu-text');

    // 2. Проверяем, был ли клик внутри самого контейнера меню (по фону меню)
    const clickedInsideMenuBlock = this.menuBlock?.nativeElement.contains(target);

    // Логика:
    // - Если кликнули на пункт меню -> ЗАКРЫВАЕМ
    // - Если кликнули МИМО контейнера меню (внутри компонента или вообще вне его) -> ЗАКРЫВАЕМ
    if (clickedOnMenuItem || !clickedInsideMenuBlock) {
      this.menuOpen = false;
    }
  }
}

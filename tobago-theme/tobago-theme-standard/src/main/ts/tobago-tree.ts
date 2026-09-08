/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Selectable} from "./tobago-selectable";
import {TreeNode} from "./tobago-tree-node";

export class Tree extends HTMLElement {

  /** ID des zuletzt fokussierten Tree-Nodes (wird über AJAX-Updates hinweg gespeichert) */
  private static focusedNodeId: string | null = null;
  /** CSS-Selektor oder Tag des zuletzt fokussierten Unter-Elements (z. B. ".tobago-toggle" oder "input") */
  private static focusedSubElementClass: string | null = null;

  constructor() {
    super();

    this.handleKeydown = this.handleKeydown.bind(this);
    // Speicher aktualisieren, wenn ein Element innerhalb des Trees den Fokus verliert
    // Ziel: Nach einem AJAX-Update kann der zuvor fokussierte Unterpunkt wiederhergestellt werden
    this.addEventListener("focusout", (event) => {
      const target = event.target as HTMLElement;
      // Finde das umschließende Tree-Node-Element
      const node = target.closest("tobago-tree-node") as HTMLElement;
      if (node && node.id) {
        // Merke die Node-ID
        Tree.focusedNodeId = node.id;
        // Merke, welches Unterelement fokussiert war (Toggle oder Input)
        if (target.classList.contains("tobago-toggle")) {
          Tree.focusedSubElementClass = ".tobago-toggle";
        } else if (target.tagName === "INPUT") {
          Tree.focusedSubElementClass = "input";
        }
      }
    });
  }

  clearSelectedNodes(): void {
    this.hiddenInputSelected.value = "[]"; //empty set
  }

  addSelectedNode(selectedNode: number): void {
    const selectedNodes = new Set(JSON.parse(this.hiddenInputSelected.value));
    selectedNodes.add(selectedNode);
    this.hiddenInputSelected.value = JSON.stringify(Array.from(selectedNodes));
  }

  deleteSelectedNode(selectedNode: number): void {
    const selectedNodes = new Set(JSON.parse(this.hiddenInputSelected.value));
    selectedNodes.delete(selectedNode);
    this.hiddenInputSelected.value = JSON.stringify(Array.from(selectedNodes));
  }

  private getSelectedNodes(): NodeListOf<TreeNode> {
    const queryString: string[] = [];
    for (const selectedNodeIndex of JSON.parse(this.hiddenInputSelected.value)) {
      if (queryString.length > 0) {
        queryString.push(", ");
      }
      queryString.push("tobago-tree-node[index='");
      queryString.push(selectedNodeIndex);
      queryString.push("']");
    }

    if (queryString.length > 0) {
      return this.querySelectorAll(queryString.join(""));
    } else {
      return null;
    }
  }

  private get hiddenInputSelected(): HTMLInputElement {
    return this.querySelector(":scope > input[type=hidden].tobago-selected");
  }

  private clearExpandedNodes(): void {
    this.hiddenInputExpanded.value = "[]"; //empty set
  }

  private addExpandedNode(expandedNode: number): void {
    const expandedNodes = new Set(JSON.parse(this.hiddenInputExpanded.value));
    expandedNodes.add(expandedNode);
    this.hiddenInputExpanded.value = JSON.stringify(Array.from(expandedNodes));
  }

  private deleteExpandedNode(expandedNode: number): void {
    const expandedNodes = new Set(JSON.parse(this.hiddenInputExpanded.value));
    expandedNodes.delete(expandedNode);
    this.hiddenInputExpanded.value = JSON.stringify(Array.from(expandedNodes));
  }

  get hiddenInputExpanded(): HTMLInputElement {
    return this.querySelector(":scope > input[type=hidden].tobago-expanded");
  }

  get selectable(): Selectable {
    return Selectable[this.getAttribute("selectable")] as Selectable;
  }

  /**
   * Alle Node-Elemente im Tree.
   * @returns NodeListOf<TreeNode>
   */
  get nodes(): NodeListOf<TreeNode> {
    return this.querySelectorAll("tobago-tree-node");
  }

  /**
   * @returns TreeNode[] - Array der sichtbaren (im Layout vorhandenen) Nodes
   */
  get visibleNodes(): TreeNode[] {
    return Array.from(this.nodes).filter(node => (node as HTMLElement).offsetParent !== null) as TreeNode[];
  }

  /**
   * @returns boolean - true, falls mindestens ein Checkbox- oder Radio-Input vorhanden ist
   */
  private get hasCheckboxes(): boolean {
    return this.querySelector("input[type=checkbox], input[type=radio]") !== null;
  }

  /**
   * Lifecycle: Wird aufgerufen, wenn das Element in das DOM eingefügt wird.
   * - Setzt tabindex auf Zeilen
   * - Stellt nach AJAX-Updates den Fokus auf das vorherige Unter-Element wieder her
   */
  connectedCallback(): void {
    // Alle Zeilen-Container selbst komplett deaktivieren (Tab-Fokus auf Zeilen verhindern)
    for (const node of Array.from(this.nodes)) {
      (node as HTMLElement).setAttribute("tabindex", "-1");

      // Jedes sichtbare Toggle und Input erhält standardmäßig tabindex="0"
      const subElements = node.querySelectorAll(".tobago-toggle, input[type=checkbox], input[type=radio]");
      subElements.forEach(el => el.setAttribute("tabindex", "0"));
    }

    // Falls ein Fokus gespeichert war, das exakte Unterelement nach AJAX-Update wiederherstellen
    if (Tree.focusedNodeId) {
      const savedNode = this.querySelector(`tobago-tree-node[id="${Tree.focusedNodeId}"]`) as HTMLElement;
      if (savedNode) {
        const targetSelector = Tree.focusedSubElementClass || ".tobago-toggle, input";
        const subEl = savedNode.querySelector(targetSelector) as HTMLElement;
        if (subEl) {
          subEl.focus();
        }
        // Keydown-Handler anhängen und zurückkehren
        this.addEventListener("keydown", this.handleKeydown);
        return;
      }
    }

    // Keydown-Handler anhängen (für Tastaturnavigation)
    this.addEventListener("keydown", this.handleKeydown);
  }

  /**
   * Lifecycle: Aufräumarbeiten beim Entfernen aus dem DOM.
   */
  disconnectedCallback(): void {
    // Best Practice: Aufräumen, wenn die Komponente entfernt wird
    this.removeEventListener("keydown", this.handleKeydown);
  }

  /**
   * Setzt den Fokus auf einen gegebenen Node.
   * @param node - TreeNode oder HTMLElement, auf das fokussiert werden soll
   * @param preferCheckbox - wenn true, soll bevorzugt die Checkbox/Radio fokussiert werden
   */
  focusNode(node: TreeNode | HTMLElement, preferCheckbox: boolean = false): void {
    if (!node) {
      return;
    }

    const toggle = node.querySelector(".tobago-toggle") as HTMLElement;
    const input = node.querySelector("input[type=checkbox], input[type=radio]") as HTMLInputElement;

    // Wenn keine Checkboxen existieren, fokussiere immer das Toggle (sofern vorhanden)
    if (!this.hasCheckboxes && toggle) {
      toggle.focus();
      return;
    }

    // Fokussiere je nach Präferenz und Verfügbarkeit
    if (input && (preferCheckbox || !toggle)) {
      input.focus();
    } else if (toggle) {
      toggle.focus();
    } else if (input) {
      input.focus();
    }
  }

  /**
   * Haupt-Handler für Tastatur-Ereignisse innerhalb des Trees.
   * Unterstützt: Space/Enter (Toggle Checkbox), Pfeiltasten für Navigation,
   * Left/Right für Ein-/Ausklappen und Sprünge.
   * @param event - KeyboardEvent
   */
  private handleKeydown(event: KeyboardEvent): void {
    // Normalize key names across browsers / platforms (some older browsers use "Up", "Down", "Left", "Right")
    const key = event.key || (event as any).key || "";
    const target = event.target as HTMLElement;
    if (!target) {
      return;
    }

    // 1. Node bestimmen (Direkt oder per Fallback)
    let node = target.closest("tobago-tree-node") as HTMLElement;
    if (!node) {
      node = Array.from(this.nodes).find(n => n.contains(document.activeElement)) as HTMLElement;
    }
    if (!node) {
      return;
    }

    // Häufig genutzte Elemente im Vorfeld einmalig abfragen
    const toggle = node.querySelector(".tobago-toggle") as HTMLElement;
    const input = node.querySelector("input[type=checkbox], input[type=radio]") as HTMLInputElement;
    const isInputTarget = target.tagName === "INPUT";

    // --- LEERTASTE & ENTER: Auswahl toggeln ---
    if ([" ", "Spacebar", "Space", "Enter"].includes(key)) {
      if (this.hasAttribute("data-debug")) {
        console.debug("tobago-tree keydown", key, "on node", node.id);
      }
      event.preventDefault();
      if (input) {
        input.checked = input.type === "radio" ? true : !input.checked;
        input.dispatchEvent(new Event("change", {bubbles: true}));
      }
      return;
    }

    // --- PFEILTASTE OBEN & UNTEN: Zum vorherigen/nächsten sichtbaren Node springen ---
    const isUp = key === "ArrowUp" || key === "Up";
    const isDown = key === "ArrowDown" || key === "Down";

    if (isUp || isDown) {
      event.preventDefault();
      event.stopPropagation();

      const all = this.visibleNodes;
      const idx = all.indexOf(node as any);
      if (idx === -1) {
        return;
      }

      const next = isUp ? all[idx - 1] : all[idx + 1];
      if (next) {
        const hasNextToggle = next.querySelector(".tobago-toggle") !== null;
        const preferCheckbox = this.hasCheckboxes && (!target.classList.contains("tobago-toggle") || !hasNextToggle);
        this.focusNode(next, preferCheckbox);
      }
      return;
    }

    // --- PFEILTASTE LINKS: Einklappen oder zum Parent springen ---
    const isLeft = key === "ArrowLeft" || key === "Left";

    if (isLeft) {
      event.preventDefault();
      const expanded = node.classList.contains("tobago-expanded");

      if (toggle) {
        if (expanded) {
          toggle.click();
          return;
        }
        //if (this.hasCheckboxes && isInputTarget) {
        //  toggle.focus();
        //  return;
        //}
      }

      // Zum Parent-Knoten springen
      const parentId = node.getAttribute("parent");
      if (parentId) {
        const parent = this.querySelector(`tobago-tree-node[id="${parentId}"]`) as HTMLElement;
        this.focusNode(parent, false);
      }
      return;
    }

    // --- PFEILTASTE RECHTS: Aufklappen oder in Kinder springen ---
    const isRight = key === "ArrowRight" || key === "Right";

    if (isRight) {
      event.preventDefault();

      const expandable = node.getAttribute("expandable") === "expandable" || node.classList.contains("tobago-expandable");
      const expanded = node.classList.contains("tobago-expanded");

      // 1. Wenn zuklappt und aufklappbar -> Aufklappen (egal ob von Toggle oder Checkbox ausgelöst)
      if (expandable && !expanded && toggle) {
        toggle.click();
        if (this.hasCheckboxes && input) {
          // Nach dem Aufklappen (oder direkt von Checkbox) Fokus auf die Checkbox setzen/halten
          setTimeout(() => input.focus(), 150);
        }
        return;
      }

      // 2. Horizontaler Sprung vom Toggle zur Checkbox (wenn bereits offen oder nicht aufklappbar)
      if (this.hasCheckboxes && target.classList.contains("tobago-toggle") && input) {
        input.focus();
        return;
      }

      // 3. Wenn schon offen, springe zum ersten sichtbaren Kind-Element
      const child = this.querySelector(`tobago-tree-node[parent="${node.id}"]`) as HTMLElement;
      if (child && (child as any).offsetParent !== null) {
        this.focusNode(child, this.hasCheckboxes);
      }
      return;
    }
  }
}

document.addEventListener("tobago.init", function (event: Event): void {
  if (window.customElements.get("tobago-tree") == null) {
    window.customElements.define("tobago-tree", Tree);
  }
});

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

  private static focusedNodeId: string | null = null;
  private static focusedSubElementClass: string | null = null;

  constructor() {
    super();
    this.handleKeydown = this.handleKeydown.bind(this);

    // Speicher aktualisieren, wenn ein Element innerhalb des Trees den Fokus verliert
    this.addEventListener("focusout", (event) => {
      const target = event.target as HTMLElement;
      const node = target.closest("tobago-tree-node") as HTMLElement;
      if (node && node.id) {
        Tree.focusedNodeId = node.id;
        // NEU: Unterelement-Typ sichern
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

  get nodes(): NodeListOf<TreeNode> {
    return this.querySelectorAll("tobago-tree-node");
  }

  // Hilfsmethode: Holt nur die aktuell sichtbaren Tree-Nodes (wichtig für die Arrow-Navigation)
  get visibleNodes(): TreeNode[] {
    return Array.from(this.nodes).filter(node => (node as HTMLElement).offsetParent !== null) as TreeNode[];
  }

  // =========================================================================
  // ÄNDERUNG: connectedCallback öffnet Tab-Index dauerhaft für Toggles und Inputs
  // =========================================================================
  connectedCallback(): void {
    // Alle Zeilen-Container selbst komplett deaktivieren
    for (const node of Array.from(this.nodes)) {
      (node as HTMLElement).setAttribute("tabindex", "-1");

      // NEU: Jedes sichtbare Toggle und Input erhält standardmäßig ein echtes tabindex="0"
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
        this.addEventListener("keydown", this.handleKeydown);
        return;
      }
    }

    this.addEventListener("keydown", this.handleKeydown);
  }

  disconnectedCallback(): void {
    // Best Practice: Aufräumen, wenn die Komponente entfernt wird
    this.removeEventListener("keydown", this.handleKeydown);
  }

  // =========================================================================
  // ÄNDERUNG: focusNode steuert nun intelligent Toggles oder Inputs an
  // =========================================================================
  focusNode(node: TreeNode | HTMLElement, preferCheckbox: boolean = false): void {
    if (!node) return;

    const toggle = node.querySelector(".tobago-toggle") as HTMLElement;
    const input = node.querySelector("input[type=checkbox], input[type=radio]") as HTMLInputElement;

    // Keine globalen Modifikationen der Indizes mehr, da alles dauerhaft auf 0 steht
    if (preferCheckbox && input) {
      input.focus();
    } else if (toggle) {
      toggle.focus();
    } else if (input) {
      input.focus();
    }
  }



  private handleKeydown(event: KeyboardEvent): void {
    const key = event.key;
    let node: HTMLElement = null;
    const target = event.target as HTMLElement;

    if (target) {
      node = target.closest("tobago-tree-node") as HTMLElement;
    }
    if (!node) {
      for (const n of Array.from(this.nodes) as TreeNode[]) {
        if ((n as HTMLElement).contains(document.activeElement)) {
          node = n as HTMLElement;
          break;
        }
      }
    }
    if (!node) {
      return;
    }

    // --- LEERTASTE & ENTER ---
    if (key === " " || key === "Spacebar" || key === "Space" || key === "Enter") {
      if (this.hasAttribute("data-debug")) {
        console.debug("tobago-tree keydown", key, "on node", node.id);
      }
      event.preventDefault();
      const input = node.querySelector("input[type=checkbox], input[type=radio]") as HTMLInputElement;
      if (input) {
        // Fix: Radio-Buttons nicht wieder deaktivieren
        if (input.type === "radio") {
          input.checked = true;
        } else {
          input.checked = !input.checked;
        }
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return;
    }

    // --- PFEILTASTE OBEN & UNTEN ---
    if (key === "ArrowUp" || key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation(); // ÄNDERUNG: Verhindert Auswahl-Klick

      const all = this.visibleNodes;
      const idx = all.indexOf(node as any);
      if (idx === -1) {
        return;
      }
      const next = key === "ArrowUp" ? all[idx - 1] : all[idx + 1];
      if (next) {
        // NEU: Merkt sich die vertikale Spaltenausrichtung (bleibt auf Input oder Toggle)
        const wasCheckbox = target.tagName === "INPUT";
        this.focusNode(next as HTMLElement, wasCheckbox);
      }
      return;
    }

    // --- PFEILTASTE LINKS ---
    if (key === "ArrowLeft") {
      event.preventDefault();
      const expanded = node.classList.contains("tobago-expanded");
      if (expanded) {
        const toggle = node.querySelector(".tobago-toggle") as HTMLElement;
        if (toggle) {
          toggle.click();
          return;
        }
      }
      const parentId = node.getAttribute("parent");
      if (parentId) {
        // Fix: Attribut-Selektor nutzen, da IDs Doppelpunkte enthalten können
        const parent = this.querySelector(`tobago-tree-node[id="${parentId}"]`) as HTMLElement;
        if (parent) {
          this.focusNode(parent);
        }
      }
      return;
    }

    // --- PFEILTASTE RECHTS ---
    if (key === "ArrowRight") {
      event.preventDefault();
      const expandable = node.getAttribute("expandable") === "expandable" || node.classList.contains("tobago-expandable");
      const expanded = node.classList.contains("tobago-expanded");

      if (expandable && !expanded) {
        const toggle = node.querySelector(".tobago-toggle") as HTMLElement;
        if (toggle) {
          toggle.click();

          // Wenn AJAX genutzt wird, müssen wir warten, bis das Kind im DOM ist.
          // Ein MutationObserver ist hier sauber, alternativ ein kurzer Timeout zum Testen:
          setTimeout(() => {
            const child = this.querySelector(`tobago-tree-node[parent="${node.id}"]`) as HTMLElement;
            if (child) {
              this.focusNode(child);
            }
          }, 150); // Wert eventuell anpassen, falls die Server-Antwort länger braucht
          return;
        }
      }

      // Wenn er schon offen war, direkt zum Kind wechseln
      const child = this.querySelector(`tobago-tree-node[parent="${node.id}"]`) as HTMLElement;
      if (child && (child as any).offsetParent !== null) {
        this.focusNode(child);
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

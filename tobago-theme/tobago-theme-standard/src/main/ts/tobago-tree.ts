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

  constructor() {
    super();
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

  // FROM HERE
  get nodes(): NodeListOf<TreeNode> {
    return this.querySelectorAll("tobago-tree-node");
  }

  connectedCallback(): void {
    // initialize roving tabindex: if no node has tabindex=0, set the first one
    const nodes = this.nodes;
    if (nodes && nodes.length > 0) {
      let found = false;
      for (const node of Array.from(nodes) as TreeNode[]) {
        if (node.getAttribute("tabindex") === "0") {
          found = true;
          break;
        }
      }
      if (!found) {
        const first = nodes[0] as HTMLElement;
        if (first) {
          first.setAttribute("tabindex", "0");
        }
      }
    }

    // listen for keyboard events on the tree and handle them centrally (delegation)
    this.addEventListener("keydown", this.handleKeydown.bind(this));
  }

  focusNode(node: TreeNode | HTMLElement): void {
    const nodes = this.nodes;
    for (const n of Array.from(nodes) as TreeNode[]) {
      (n as HTMLElement).setAttribute("tabindex", "-1");
    }
    const el = node as HTMLElement;
    el.setAttribute("tabindex", "0");
    el.focus();
  }

  private handleKeydown(event: KeyboardEvent): void {
    const key = event.key;
    // find the tree-node that is the origin or contains the active element
    let node: HTMLElement = null;
    const target = event.target as HTMLElement;
    if (target) {
      node = target.closest("tobago-tree-node") as HTMLElement;
    }
    if (!node) {
      // fallback: find the node that contains document.activeElement
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

    // Space / Enter -> toggle the input inside the node
    if (key === " " || key === "Spacebar" || key === "Space" || key === "Enter") {
      if (this.hasAttribute("data-debug")) {
        console.debug("tobago-tree keydown", key, "on node", node.id);
      }
      event.preventDefault();
      const input = node.querySelector("input[type=checkbox], input[type=radio]") as HTMLInputElement;
      if (input) {
        input.checked = !input.checked;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return;
    }

    // Up / Down -> move focus to previous/next node
    if (key === "ArrowUp" || key === "ArrowDown") {
      event.preventDefault();
      const all = Array.from(this.nodes) as TreeNode[];
      const idx = all.indexOf(node as any);
      if (idx === -1) {
        return;
      }
      const next = key === "ArrowUp" ? all[idx - 1] : all[idx + 1];
      if (next) {
        this.focusNode(next as HTMLElement);
      }
      return;
    }

    // Left -> collapse or focus parent
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
        const parent = this.querySelector(`#${parentId}`) as HTMLElement;
        if (parent) {
          this.focusNode(parent);
        }
      }
      return;
    }

    // Right -> expand or focus first child
    if (key === "ArrowRight") {
      event.preventDefault();
      const expandable = node.getAttribute("expandable") === "expandable" || node.classList.contains("tobago-expandable");
      const expanded = node.classList.contains("tobago-expanded");
      if (expandable && !expanded) {
        const toggle = node.querySelector(".tobago-toggle") as HTMLElement;
        if (toggle) {
          toggle.click();
          return;
        }
      }
      const child = this.querySelector(`tobago-tree-node[parent='${node.id}']`) as HTMLElement;
      if (child) {
        this.focusNode(child);
      }
      return;
    }
  }
  //TO HERE
}

document.addEventListener("tobago.init", function (event: Event): void {
  if (window.customElements.get("tobago-tree") == null) {
    window.customElements.define("tobago-tree", Tree);
  }
});

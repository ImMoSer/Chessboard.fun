Dein Vorhaben ist sehr sinnvoll, um dem Nutzer klare Leitplanken bei der Erstellung des Repertoires zu geben.

**Optimale Architektur:**
Ich empfehle, die reine Überprüfungslogik in ein **eigenes, neues Modul** auszulagern (z.B. `@src/features/study-reply-training/lib/repertoire-validation.ts`).
*Warum?* Die Validierung eines Baums (Tree Traversal) ist reine Geschäftslogik. Wenn wir sie in Stores oder UI-Komponenten (wie `StudyTreeNode.vue`) mischen, blähen wir diese unnötig auf. Ein separates Modul ist besser testbar, wiederverwendbar und trennt die UI von der Logik.

Hier ist der **detaillierte Plan**, wie ich das umsetzen werde:

### 1. Neues Logik-Modul erstellen (`repertoire-validation.ts`)
Wir definieren dort zwei Hilfsfunktionen:
*   `isChapterTrimmed(chapter: StudyChapter): boolean`
    Geht den gesamten PGN-Baum des Chapters rekursiv durch. Wir prüfen anhand von `node.ply` (Anzahl der Halbzüge), wer am Zug ist. Wenn die `userColor` am Zug ist und ein Knoten **mehr als 1 Kind** (`children.length > 1`) hat, wird das Chapter als "nicht fertig" (false) markiert.
*   `isNodeNeedingTrim(node: PgnNode, userColor: 'white' | 'black'): boolean`
    Prüft für einen spezifischen Knoten (den wir rendern), ob er a) ein Zug des Users ist, b) es in diesem Zweig Alternativen gibt (`node.parent.children.length > 1`) und c) ob dieser Knoten der Mainline-Zug ist (`node === node.parent.children[0]`).

### 2. Store anpassen (`reply-training.store.ts`)
Wir aktualisieren `isReadyToReply`:
*   Es reicht nicht mehr, dass `c.chapter_type === 'repertoire'` ist.
*   Wir fügen die strenge Bedingung hinzu: `isChapterTrimmed(c)` muss für alle diese Chapter `true` sein.

### 3. Sidebar anpassen (`StudySidebar.vue`)
*   Wir holen uns den Trim-Status jedes Chapters über das neue Modul.
*   An der Stelle, wo aktuell das blaue Badge `<span class="tag-rep">REP</span>` gerendert wird, bauen wir eine Weiche ein:
    *   Wenn getrimmt -> blaues `REP` Badge.
    *   Wenn **nicht** getrimmt -> neues, rotes `TRIM` Badge.

### 4. Tree Node anpassen (`StudyTreeNode.vue`)
*   Wir nutzen die Funktion `isNodeNeedingTrim(props.node, currentChapterColor)`.
*   Wenn sie `true` zurückgibt, hängen wir eine neue CSS-Klasse (z.B. `needs-trim`) an den Knoten (`<span class="move-san">`).
*   Im `<style>`-Block definieren wir, dass `.move-san.needs-trim` eine auffällige rote Färbung bekommt (z.B. Schrift rot, oder roter Rahmen), damit der User sofort sieht: *"Hier muss ich Alternativen löschen"*.

Bist du mit diesem Architektur-Ansatz und dem Plan einverstanden? Wenn du mit "OK" antwortest, setze ich den Code direkt um!

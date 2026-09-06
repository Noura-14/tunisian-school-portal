<script>

    import { page } from '$app/state';

    import { getContext, onMount } from 'svelte';

    import AppIcon from '$lib/components/AppIcon.svelte';

    import {

        behaviorTypes,

        getStudentAlertLevel,

        loadBehaviorRecords,

        saveBehaviorRecords

    } from '$lib/data/behavior.js';

    import { classOptions, importedStudents } from '$lib/data/students.js';

    const appState = getContext('app-state');

    const isArabic = $derived(appState.language === 'ar');

    /** @typedef {{ id: string, studentId: string, behaviorTypes: string[], otherBehavior: string, notes: string, summary: string, createdAt: string }} BehaviorRecord */

    /** @type {BehaviorRecord[]} */

    let records = $state([]);

    let searchTerm = $state('');

    let selectedClass = $state('all');

    let selectedLevel = $state('all');

    /** @type {'form' | null} */

    let activeModal = $state(null);

    /** @type {BehaviorRecord | null} */

    let selectedRecord = $state(null);

    let selectedStudentId = $state('');

    let studentQuery = $state('');
    let studentDropdownOpen = $state(false);

    /** @type {string[]} */

    let selectedTypes = $state([]);

    let otherBehavior = $state('');

    let notes = $state('');

    let summary = $state('');

    let formError = $state('');

    let summaryManuallyEdited = $state(false);

    // Student whose alert popup is currently open.

    let openStudentId = $state(null);

    onMount(() => {

        records = loadBehaviorRecords();

        const requestedStudent = page.url.searchParams.get('student');

        if (requestedStudent) {

            selectedStudentId = requestedStudent;

        }

        if (page.url.searchParams.get('action') === 'add') {

            activeModal = 'form';

        }

    });

    const selectedStudent = $derived(

        importedStudents.find((student) => student.id === selectedStudentId) || null

    );

   const studentOptions = $derived(
    importedStudents.filter((student) => {
        const query = studentQuery.trim().toLocaleLowerCase();

        return (
            !query ||
            `${student.firstName} ${student.lastName}`
                .toLocaleLowerCase()
                .includes(query)
        );
    })
);

const studentsByClass = $derived(
    classOptions.map((className) => ({
        className,
        students: studentOptions.filter(
            (student) => student.className === className
        )
    }))
);

    /*

     * GROUP THE RECORDS BY STUDENT.

     *

     * This is the important change:

     *

     * Before:

     * Student A → alert 1 → row

     * Student A → alert 2 → row

     * Student A → alert 3 → row

     *

     * Now:

     * Student A → ONE row → 3 alerts inside it

     */

    const groupedStudents = $derived(

        importedStudents

            .map((student) => {

                const studentRecords = records

                    .filter((record) => record.studentId === student.id)

                    .sort(

                        (a, b) =>

                            new Date(b.createdAt).getTime() -

                            new Date(a.createdAt).getTime()

                    );

                return {

                    student,

                    records: studentRecords,

                    alertCount: studentRecords.length,

                    level: Math.min(studentRecords.length, 3)

                };

            })

            .filter((item) => item.records.length > 0)

    );

    const filteredStudents = $derived(

        groupedStudents.filter((item) => {

            const query = searchTerm.trim().toLocaleLowerCase();

            const fullName =

                `${item.student.firstName} ${item.student.lastName}`.toLocaleLowerCase();

            const matchesSearch = !query || fullName.includes(query);

            const matchesClass =

                selectedClass === 'all' ||

                item.student.className === selectedClass;

            const matchesLevel =

                selectedLevel === 'all' ||

                item.level === Number(selectedLevel);

            return matchesSearch && matchesClass && matchesLevel;

        })

    );

    /** @param {string} studentId */

/** @param {string} studentId */

    function toggleStudentPopover(studentId) {

        // @ts-ignore

        openStudentId =

            openStudentId === studentId ? null : studentId;

    }

    function closeStudentPopover() {

        openStudentId = null;

    }

    function resetForm() {

        selectedRecord = null;

        selectedTypes = [];

        otherBehavior = '';

        notes = '';

        summary = '';

        formError = '';

        studentQuery = '';

        summaryManuallyEdited = false;

    }

    function openAdd(studentId = '') {

        resetForm();

        selectedStudentId = studentId;

        openStudentId = null;

        activeModal = 'form';

    }

    /** @param {BehaviorRecord} record */

    /** @param {BehaviorRecord} record */

    function openEdit(record) {

        selectedRecord = record;

        selectedStudentId = record.studentId;

        selectedTypes = [...record.behaviorTypes];

        otherBehavior = record.otherBehavior || '';

        notes = record.notes || '';

        summary = record.summary || '';

        formError = '';

        summaryManuallyEdited = false;

        openStudentId = null;

        activeModal = 'form';

    }

    function closeModal() {

        activeModal = null;

        resetForm();

    }

    /** @param {string} typeId */

    /** @param {string} typeId */

    function toggleType(typeId) {

        selectedTypes = selectedTypes.includes(typeId)

            ? selectedTypes.filter((id) => id !== typeId)

            : [...selectedTypes, typeId];

        summaryManuallyEdited = false;

    }

    function selectedTypeLabels() {

        return selectedTypes

            .map((id) => {

                const type = behaviorTypes.find((item) => item.id === id);

                if (!type) return '';

                if (id === 'other' && otherBehavior.trim()) {

                    return otherBehavior.trim();

                }

                return isArabic ? type.ar : type.en;

            })

            .filter(Boolean);

    }

    function buildSummary(short = false) {

        if (!selectedStudent || !selectedTypes.length) {

            return '';

        }

        if (

            selectedTypes.includes('other') &&

            !otherBehavior.trim()

        ) {

            return '';

        }

        const types = selectedTypeLabels();

        const name =

            `${selectedStudent.firstName} ${selectedStudent.lastName}`;

        if (isArabic) {

            const behaviorText =

                types.length === 1

                    ? types[0]

                    : types.slice(0, -1).join('، ') +

                        ' و' +

                        types[types.length - 1];

            const base = short

                ? `${name} — ${behaviorText}.`

                : `${name}، تلميذ بقسم ${selectedStudent.className}، صدر عنه سلوك يتمثل في ${behaviorText}.`;

            return notes.trim() && !short

                ? `${base} ملاحظات: ${notes.trim()}`

                : base;

        }

        const behaviorText = types.join(', ');

        const base = short

            ? `${name} — ${behaviorText}.`

            : `${name}, a student in ${selectedStudent.className}, was involved in the following behaviour: ${behaviorText}.`;

        return notes.trim() && !short

            ? `${base} Notes: ${notes.trim()}`

            : base;

    }

    /*

     * LIVE AUTOMATIC SUMMARY

     */

    $effect(() => {

        selectedStudent;

        selectedTypes;

        otherBehavior;

        notes;

        isArabic;

        if (!summaryManuallyEdited) {

            const generated = buildSummary(false);

            if (generated) {

                summary = generated;

            } else if (

                !selectedStudentId ||

                selectedTypes.length === 0

            ) {

                summary = '';

            }

        }

    });

    /** @param {Event} event */

    /** @param {Event} event */

    function handleSummaryInput(event) {

        const textarea =

            /** @type {HTMLTextAreaElement} */ (event.currentTarget);

        summary = textarea.value;

        summaryManuallyEdited = true;

        formError = '';

    }

    function rewriteSummary() {

        summaryManuallyEdited = false;

        summary = buildSummary(false);

        formError = '';

    }

    function shortenSummary() {

        summaryManuallyEdited = false;

        summary = buildSummary(true);

        formError = '';

    }

    function saveRecord() {

        if (!selectedStudentId || !selectedTypes.length) {

            formError = isArabic

                ? 'يرجى اختيار التلميذ والسلوك.'

                : 'Please select a student and at least one behaviour.';

            return;

        }

        if (

            selectedTypes.includes('other') &&

            !otherBehavior.trim()

        ) {

            formError = isArabic

                ? 'يرجى تحديد السلوك الآخر.'

                : 'Please specify the Other behaviour.';

            return;

        }

        if (!summary.trim()) {

            formError = isArabic

                ? 'يرجى مراجعة الملخص قبل الحفظ.'

                : 'Please review the summary before saving.';

            return;

        }

        const selectedId = selectedRecord?.id;

        const record = {

            id: selectedId || `behavior-${Date.now()}`,

            studentId: selectedStudentId,

            behaviorTypes: [...selectedTypes],

            otherBehavior: otherBehavior.trim(),

            notes: notes.trim(),

            summary: summary.trim(),

            createdAt:

                selectedRecord?.createdAt ||

                new Date().toISOString()

        };

        records = selectedId

            ? records.map((item) =>

                    item.id === selectedId ? record : item

                )

            : [...records, record];

        saveBehaviorRecords(records);

        closeModal();

    }

    /** @param {BehaviorRecord} record */

    /** @param {BehaviorRecord} record */

    function deleteRecord(record) {

        if (

            !window.confirm(

                isArabic

                    ? 'هل أنت متأكد من حذف هذا التنبيه؟'

                    : 'Are you sure you want to delete this alert?'

            )

        ) {

            return;

        }

        records = records.filter(

            (item) => item.id !== record.id

        );

        saveBehaviorRecords(records);

    }

    /** @param {string} studentId */

    /** @param {string} studentId */

    function studentName(studentId) {

        const student = importedStudents.find(

            (item) => item.id === studentId

        );

        return student

            ? `${student.firstName} ${student.lastName}`

            : '';

    }

    /** @param {number} level */

    function levelLabel(level) {

        if (level >= 3) {

            return isArabic

                ? 'التنبيه الثالث'

                : 'Third alert';

        }

        if (level === 2) {

            return isArabic

                ? 'التنبيه الثاني'

                : 'Second alert';

        }

        return isArabic

            ? 'التنبيه الأول'

            : 'First alert';

    }

    /** @param {BehaviorRecord} record */

    /** @param {BehaviorRecord} record */

    function getBehaviourNames(record) {

        return record.behaviorTypes

            .map((id) => {

                const type = behaviorTypes.find(

                    (item) => item.id === id

                );

                if (!type) return '';

                if (

                    id === 'other' &&

                    record.otherBehavior

                ) {

                    return record.otherBehavior;

                }

                return isArabic ? type.ar : type.en;

            })

            .filter(Boolean)

            .join(isArabic ? '، ' : ', ');

    }

    /** @param {string} value */

    function formatDateTime(value) {

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {

        return value;

    }

    return new Intl.DateTimeFormat('en-GB', {

        day: '2-digit',

        month: 'short',

        year: 'numeric',

        hour: '2-digit',

        minute: '2-digit',

        hour12: false

    }).format(date);

}

</script>

<svelte:window

    onkeydown={(event) =>

        event.key === 'Escape' && closeModal()

    }

/>

<svelte:head>

    <title>

        {isArabic

            ? 'السلوك | فضاء المتابعة'

            : 'Behaviour | Follow-up Portal'}

    </title>

</svelte:head>

<section

    class="behaviour-page"

    aria-labelledby="behaviour-title"

>

    <header class="page-heading">

        <div>

            <p class="eyebrow">

                {isArabic

                    ? 'المتابعة السلوكية'

                    : 'Behaviour follow-up'}

            </p>

            <h1 id="behaviour-title">

                {isArabic ? 'السلوك' : 'Behaviour'}

            </h1>

            <p>

                {isArabic

                    ? 'متابعة التنبيهات والملاحظات السلوكية للتلاميذ.'

                    : 'Track student behaviour alerts and notes.'}

            </p>

        </div>

        <button

            class="add-button"

            type="button"

            onclick={() => openAdd()}

        >

            + {isArabic ? 'إضافة تنبيه' : 'Add Alert'}

        </button>

    </header>

    <section class="filters">

        <label

            class="search-field"

            for="behaviour-search"

        >

            <AppIcon name="students" size={18} />

            <input

                id="behaviour-search"

                bind:value={searchTerm}

                type="search"

                placeholder={

                    isArabic

                        ? 'البحث عن تلميذ...'

                        : 'Search for a student...'

                }

            />

        </label>

        <label>

            <span>

                {isArabic ? 'القسم' : 'Class'}

            </span>

            <select bind:value={selectedClass}>

                <option value="all">

                    {isArabic ? 'الكل' : 'All'}

                </option>

                {#each classOptions as className}

                    <option value={className}>

                        {className}

                    </option>

                {/each}

            </select>

        </label>

        <label>

            <span>

                {isArabic

                    ? 'مستوى التنبيه'

                    : 'Alert level'}

            </span>

            <select bind:value={selectedLevel}>

                <option value="all">

                    {isArabic ? 'الكل' : 'All'}

                </option>

                <option value="1">

                    {isArabic

                        ? 'التنبيه الأول'

                        : 'First alert'}

                </option>

                <option value="2">

                    {isArabic

                        ? 'التنبيه الثاني'

                        : 'Second alert'}

                </option>

                <option value="3">

                    {isArabic

                        ? 'التنبيه الثالث'

                        : 'Third alert'}

                </option>

            </select>

        </label>

    </section>

    {#if filteredStudents.length}

        <div class="record-list">

            <table>

                <thead>

                    <tr>

                        <th>

                            {isArabic

                                ? 'التلميذ'

                                : 'Student'}

                        </th>

                        <th>

                            {isArabic

                                ? 'القسم'

                                : 'Class'}

                        </th>

                        <th>

                            {isArabic

                                ? 'التنبيهات'

                                : 'Alerts'}

                        </th>

                        <th>

                            {isArabic

                                ? 'آخر سلوك'

                                : 'Latest Behaviour'}

                        </th>

                        <th>

                            {isArabic

                                ? 'آخر تاريخ'

                                : 'Latest Date'}

                        </th>

                        <th>

                            {isArabic

                                ? 'الإجراءات'

                                : 'Actions'}

                        </th>

                    </tr>

                </thead>

                <tbody>

                    {#each filteredStudents as item (

                        item.student.id

                    )}

                        <tr>

                            <td>

                                <strong>

                                    {item.student.firstName}

                                    {item.student.lastName}

                                </strong>

                            </td>

                            <td>

                                {item.student.className}

                            </td>

                            <td>

                                <div

                                    class="alert-cell"

                                        role="group"

                                    onmouseleave={

                                        closeStudentPopover

                                    }

                                >

                                    <button

                                        class="alert-trigger level-{item.level}"

                                        type="button"

                                        aria-expanded={

                                            openStudentId ===

                                            item.student.id

                                        }

                                        aria-label={

                                            isArabic

                                                ? `عرض تنبيهات ${item.student.firstName}`

                                                : `View alerts for ${item.student.firstName}`

                                        }

                                        onclick={() =>

                                            toggleStudentPopover(

                                                item.student.id

                                            )}

                                    >

                                        <span class="alert-dot"></span>

                                        <span>

                                            {item.alertCount}

                                            {isArabic

                                                ? ' تنبيهات'

                                                : item.alertCount ===

                                                        1

                                                    ? ' alert'

                                                    : ' alerts'}

                                        </span>

                                        <span

                                            class="alert-arrow"

                                            aria-hidden="true"

                                        >

                                            ⌄

                                        </span>

                                    </button>

                                    <div

                                        class="alert-popover"

                                        class:popover-open={

                                            openStudentId ===

                                            item.student.id

                                        }

                                        role="dialog"

                                        aria-label={

                                            isArabic

                                                ? 'سجل التنبيهات'

                                                : 'Alert history'

                                        }

                                    >

                                        <div class="popover-header">

                                            <div>

                                                <strong>

                                                    {item.student.firstName}

                                                    {' '}

                                                    {item.student.lastName}

                                                </strong>

                                                <span>

                                                    {item.student.className}

                                                </span>

                                            </div>

                                            <span

                                                class="popover-level level-{item.level}"

                                            >

                                                <span class="mini-dot"></span>

                                                {levelLabel(

                                                    item.level

                                                )}

                                            </span>

                                        </div>

                                        <div class="alert-history">

                                            {#each item.records as record, index (

                                                record.id

                                            )}

                                                <article class="alert-history-item">

                                                    <div class="history-number level-{Math.min(

                                                        index + 1,

                                                        3

                                                    )}">

                                                        {index + 1}

                                                    </div>

                                                    <div class="history-content">

                                                        <div class="history-top">

                                                            <strong>

                                                                {isArabic

                                                                    ? `التنبيه ${index + 1}`

                                                                    : `Alert ${index + 1}`}

                                                            </strong>

                                                            <time>

                                                                {formatDateTime(record.createdAt)}

                                                            </time>

                                                        </div>

                                                        <p class="behaviour-list">

                                                            {getBehaviourNames(

                                                                record

                                                            )}

                                                        </p>

                                                        {#if record.notes}

                                                            <small>

                                                                <strong>

                                                                    {isArabic

                                                                        ? 'ملاحظات:'

                                                                        : 'Notes:'}

                                                                </strong>

                                                                {record.notes}

                                                            </small>

                                                        {/if}

                                                        <div class="history-actions">

                                                            <button

                                                                type="button"

                                                                onclick={() =>

                                                                    openEdit(

                                                                        record

                                                                    )}

                                                            >

                                                                <AppIcon

                                                                    name="edit"

                                                                    size={14}

                                                                />

                                                                {isArabic

                                                                    ? 'تعديل'

                                                                    : 'Edit'}

                                                            </button>

                                                            <button

                                                                class="history-delete"

                                                                type="button"

                                                                onclick={() =>

                                                                    deleteRecord(

                                                                        record

                                                                    )}

                                                            >

                                                                <AppIcon

                                                                    name="delete"

                                                                    size={14}

                                                                />

                                                                {isArabic

                                                                    ? 'حذف'

                                                                    : 'Delete'}

                                                            </button>

                                                        </div>

                                                    </div>

                                                </article>

                                            {/each}

                                        </div>

                                        <div class="popover-footer">

                                            <span>

                                                {isArabic

                                                    ? `${item.alertCount} تنبيه`

                                                    : `${item.alertCount} ${

                                                            item.alertCount ===

                                                            1

                                                                ? 'alert'

                                                                : 'alerts'

                                                        }`}

                                            </span>

                                            <button

                                                type="button"

                                                onclick={() =>

                                                    openAdd(

                                                        item.student.id

                                                    )}

                                            >

                                                +

                                                {isArabic

                                                    ? ' إضافة تنبيه'

                                                    : ' Add alert'}

                                            </button>

                                        </div>

                                    </div>

                                </div>

                            </td>

                            <td>

                                <span class="latest-behaviour">

                                    {getBehaviourNames(

                                        item.records[0]

                                    )}

                                </span>

                            </td>

                            <td>

                                {formatDateTime(item.records[0].createdAt)}

                            </td>

                            <td>

                                <div class="row-actions">

                                    <button

                                        type="button"

                                        aria-label={

                                            isArabic

                                                ? 'عرض التنبيهات'

                                                : 'View alerts'

                                        }

                                        onclick={() =>

                                            toggleStudentPopover(

                                                item.student.id

                                            )}

                                    >

                                        <span class="eye-icon" aria-hidden="true"></span>

                                    </button>

                                    <button

                                        type="button"

                                        aria-label={

                                            isArabic

                                                ? 'إضافة تنبيه'

                                                : 'Add alert'

                                        }

                                        onclick={() =>

                                            openAdd(

                                                item.student.id

                                            )}

                                    >

                                        +

                                    </button>

                                </div>

                            </td>

                        </tr>

                    {/each}

                </tbody>

            </table>

        </div>

    {:else}

        <div class="empty-state">

            {isArabic

                ? 'لا توجد تنبيهات سلوكية بعد.'

                : 'No behaviour alerts yet.'}

        </div>

    {/if}

</section>

{#if activeModal === 'form'}

    <div

        class="modal-backdrop"

        role="presentation"

        onclick={(event) =>

            event.target === event.currentTarget &&

            closeModal()}

    >

        <dialog

            open

            class="modal"

            aria-labelledby="form-title"

        >

            <button

                class="modal-close"

                type="button"

                aria-label={

                    isArabic ? 'إغلاق' : 'Close'

                }

                onclick={closeModal}

            >

                ×

            </button>

            <p class="eyebrow">

                {selectedRecord

                    ? isArabic

                        ? 'تعديل التنبيه'

                        : 'Edit alert'

                    : isArabic

                        ? 'تنبيه سلوكي جديد'

                        : 'New behaviour alert'}

            </p>

            <h2 id="form-title">

                {selectedRecord

                    ? isArabic

                        ? 'تعديل التنبيه'

                        : 'Edit Alert'

                    : isArabic

                        ? 'إضافة تنبيه'

                        : 'Add Alert'}

            </h2>

            <form

                onsubmit={(event) => {

                    event.preventDefault();

                    saveRecord();

                }}

            >

                <label class="student-label">

                    <span>

                        {isArabic ? 'التلميذ' : 'Student'}

                    </span>

                    <input

                        bind:value={studentQuery}

                        placeholder={

                            isArabic

                                ? 'ابحث لاختيار تلميذ...'

                                : 'Search to select a student...'

                        }

                        disabled={Boolean(selectedRecord)}
                        onfocus={() => !selectedRecord && (studentDropdownOpen = true)}
                        oninput={() => {
                            if (!selectedRecord) {
                                studentDropdownOpen = true;
                                selectedStudentId = '';
                            }
                        }}
                    />

                    {#if !selectedRecord}
                        <div class="student-picker">
                            <button
                                type="button"
                                class="student-picker-trigger"
                                aria-haspopup="listbox"
                                aria-expanded={studentDropdownOpen}
                                onclick={() => (studentDropdownOpen = !studentDropdownOpen)}
                            >
                                <span>
                                    {selectedStudent
                                        ? `${selectedStudent.firstName} ${selectedStudent.lastName}`
                                        : isArabic
                                            ? 'اختر التلميذ'
                                            : 'Select student'}
                                </span>
                                <span class="student-picker-chevron" aria-hidden="true">⌄</span>
                            </button>

                            {#if studentDropdownOpen}
                                <div class="student-dropdown" role="listbox">
                                    {#if studentsByClass.some((group) => group.students.length > 0)}
                                        {#each studentsByClass as classGroup}
                                            {#if classGroup.students.length > 0}
                                                <section class="student-class-group">
                                                    <div class="student-class-header">
                                                        <span>{classGroup.className}</span>
                                                        <span class="student-class-count">
                                                            {classGroup.students.length}
                                                        </span>
                                                    </div>
                                                    <div class="student-class-list">
                                                        {#each classGroup.students as student}
                                                            <button
                                                                type="button"
                                                                role="option"
                                                                aria-selected={selectedStudentId === student.id}
                                                                class:selected={selectedStudentId === student.id}
                                                                class="student-option"
                                                                onclick={() => {
                                                                    selectedStudentId = student.id;
                                                                    studentQuery = `${student.firstName} ${student.lastName}`;
                                                                    studentDropdownOpen = false;
                                                                }}
                                                            >
                                                                <span class="student-option-name">
                                                                    {student.firstName} {student.lastName}
                                                                </span>
                                                                <span class="student-option-class">
                                                                    {student.className}
                                                                </span>
                                                            </button>
                                                        {/each}
                                                    </div>
                                                </section>
                                            {/if}
                                        {/each}
                                    {:else}
                                        <div class="student-no-results">
                                            {isArabic ? 'لم يتم العثور على تلميذ.' : 'No students found.'}
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    {/if}

                </label>

                {#if selectedStudent}

                    <div class="selected-student">

                        <strong>

                            {selectedStudent.firstName}

                            {' '}

                            {selectedStudent.lastName}

                        </strong>

                        <span>

                            {selectedStudent.className}

                        </span>

                    </div>

                {/if}

                <fieldset>

                    <legend>

                        {isArabic

                            ? 'نوع السلوك'

                            : 'Behaviour type'}

                    </legend>

                    <div class="behaviour-options">

                        {#each behaviorTypes as type}

                            <label class="check-option">

                                <input

                                    type="checkbox"

                                    checked={selectedTypes.includes(

                                        type.id

                                    )}

                                    onchange={() =>

                                        toggleType(

                                            type.id

                                        )}

                                />

                                <span>

                                    {isArabic

                                        ? type.ar

                                        : type.en}

                                </span>

                            </label>

                        {/each}

                    </div>

                </fieldset>

                {#if selectedTypes.includes('other')}

                    <label class="other-field">

                        <span>

                            {isArabic

                                ? 'السلوك الآخر'

                                : 'Other behaviour'}

                        </span>

                        <input

                            bind:value={otherBehavior}

                            placeholder={

                                isArabic

                                    ? 'يرجى تحديد السلوك...'

                                    : 'Please specify the behaviour...'

                            }

                        />

                    </label>

                {/if}

                <label class="notes-field">

                    <span>

                        {isArabic

                            ? 'ملاحظات إضافية'

                            : 'Additional notes'}

                    </span>

                    <textarea

                        bind:value={notes}

                        rows="3"

                        placeholder={

                            isArabic

                                ? 'ملاحظات إضافية...'

                                : 'Additional notes...'

                        }

                    ></textarea>

                </label>

                {#if summary}

                    <section class="summary-box">

                        <div class="summary-heading">

                            <div>

                                <span class="summary-icon">

                                    ✨

                                </span>

                                <div>

                                    <strong>

                                        {isArabic

                                            ? 'الملخص'

                                            : 'Summary'}

                                    </strong>

                                    <small>

                                        {isArabic

                                            ? 'يتم تحديثه تلقائياً'

                                            : 'Updates automatically'}

                                    </small>

                                </div>

                            </div>

                        </div>

                        <textarea

                            value={summary}

                            oninput={handleSummaryInput}

                            rows="5"

                            aria-label={

                                isArabic

                                    ? 'الملخص'

                                    : 'Summary'

                            }

                        ></textarea>

                        {#if summaryManuallyEdited}

                            <p class="summary-note">

                                {isArabic

                                    ? 'تم تعديل الملخص يدوياً.'

                                    : 'Summary manually edited.'}

                            </p>

                        {/if}

                    </section>

                {/if}

                {#if formError}

                    <p

                        class="form-error"

                        role="alert"

                    >

                        {formError}

                    </p>

                {/if}

                <div class="modal-actions">

                    {#if summary}

                        <button

                            class="secondary-button"

                            type="button"

                            onclick={rewriteSummary}

                        >

                            {isArabic

                                ? 'إعادة الصياغة'

                                : 'Rewrite'}

                        </button>

                        <button

                            class="secondary-button"

                            type="button"

                            onclick={shortenSummary}

                        >

                            {isArabic

                                ? 'اختصار'

                                : 'Shorten'}

                        </button>

                        <button

                            class="primary-button"

                            type="submit"

                        >

                            {isArabic

                                ? 'حفظ التنبيه'

                                : 'Save Alert'}

                        </button>

                    {/if}

                </div>

            </form>

        </dialog>

    </div>

{/if}

<style>
.behaviour-page{animation:page-enter .3s ease both;max-width:1400px;margin:0 auto;padding:clamp(.25rem,1vw,.75rem) 0 2rem;color:var(--app-text)}
.page-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin:0 0 1.25rem;padding:1.35rem 1.4rem;border:1px solid var(--app-border);border-radius:18px;background:linear-gradient(135deg,var(--app-surface) 0%,var(--app-surface-soft) 100%);box-shadow:var(--app-shadow)}
.eyebrow{margin:0 0 .35rem;color:var(--app-accent);font-size:.78rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase}h1,h2,p{margin-top:0}h1{margin-bottom:.35rem;font-size:clamp(1.65rem,3vw,2.25rem);letter-spacing:-.03em}.page-heading p:last-child{margin:0;color:var(--app-muted);font-size:.92rem;line-height:1.6}
.add-button,.primary-button,.secondary-button{min-height:2.75rem;padding:.65rem 1rem;border-radius:10px;cursor:pointer;font:inherit;font-weight:800;transition:transform .16s ease,background .16s ease,border-color .16s ease,box-shadow .16s ease}.add-button,.primary-button{border:1px solid var(--app-accent);background:var(--app-accent);color:#fff;box-shadow:0 7px 18px rgba(139,30,63,.18)}.add-button:hover,.primary-button:hover{background:var(--app-accent-dark);transform:translateY(-1px);box-shadow:0 10px 22px rgba(139,30,63,.22)}
.filters{display:grid;grid-template-columns:minmax(0,1fr) 180px 180px;gap:.7rem;margin-bottom:1rem;padding:.8rem;border:1px solid var(--app-border);border-radius:15px;background:var(--app-surface);box-shadow:0 5px 18px rgba(55,35,35,.05)}.search-field{display:flex;min-height:2.7rem;align-items:center;gap:.55rem;padding:0 .8rem;border:1px solid var(--app-border);border-radius:10px;background:var(--app-surface-strong);color:var(--app-accent)}.search-field input{width:100%;border:0;outline:0;background:transparent;color:var(--app-text);font:inherit;font-size:.94rem}.filters label:not(.search-field){display:flex;flex-direction:column;gap:.3rem;color:var(--app-muted);font-size:.75rem;font-weight:700}.filters select,.modal input,.modal textarea{width:100%;min-height:2.7rem;padding:.6rem .7rem;border:1px solid var(--app-border);border-radius:10px;background:var(--app-surface-strong);color:var(--app-text);font:inherit;outline:none}.filters select:focus,.modal input:focus,.modal textarea:focus{border-color:var(--app-accent);box-shadow:0 0 0 3px var(--app-accent-soft)}
.record-list{width:100%;overflow:visible;border:1px solid var(--app-border);border-radius:16px;background:var(--app-surface);box-shadow:var(--app-shadow)}table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed}th,td{padding:1rem 1.05rem;border-bottom:1px solid var(--app-border);text-align:start;vertical-align:middle;line-height:1.55}th{background:var(--app-surface-soft);color:var(--app-muted);font-size:.73rem;font-weight:800;text-transform:uppercase;letter-spacing:.035em}thead th:first-child{border-radius:16px 0 0 0}thead th:last-child{border-radius:0 16px 0 0}td{font-size:.88rem}tbody tr{transition:background .15s ease,transform .15s ease}tbody tr:hover{background:var(--app-surface-soft)}tbody tr:last-child td{border-bottom:0}.record-list th:nth-child(1),.record-list td:nth-child(1){width:19%}.record-list th:nth-child(2),.record-list td:nth-child(2){width:10%}.record-list th:nth-child(3),.record-list td:nth-child(3){width:15%}.record-list th:nth-child(4),.record-list td:nth-child(4){width:28%}.record-list th:nth-child(5),.record-list td:nth-child(5){width:18%}.record-list th:nth-child(6),.record-list td:nth-child(6){width:10%}
.alert-cell{position:relative;display:inline-flex;align-items:center}.alert-trigger{display:inline-flex;align-items:center;gap:.45rem;min-height:2.25rem;padding:.35rem .7rem;border:1px solid var(--app-border);border-radius:999px;background:var(--app-surface-strong);color:var(--app-text);cursor:pointer;font:inherit;font-size:.8rem;font-weight:800;transition:.16s ease}.alert-trigger:hover{transform:translateY(-1px);border-color:currentColor;background:var(--app-accent-soft)}.alert-dot,.mini-dot{display:inline-block;width:.55rem;height:.55rem;border-radius:50%;background:currentColor}.alert-trigger.level-1,.popover-level.level-1{color:#278653}.alert-trigger.level-2,.popover-level.level-2{color:#b67813}.alert-trigger.level-3,.popover-level.level-3{color:#d33737}.alert-trigger.level-3{border-color:rgba(211,55,55,.3);background:rgba(211,55,55,.06)}.alert-arrow{font-size:.9rem;line-height:1}
.alert-popover{position:absolute;z-index:50;top:calc(100% + .55rem);inset-inline-start:0;width:min(34rem,82vw);padding:.95rem;border:1px solid var(--app-border);border-radius:16px;background:var(--app-surface);box-shadow:0 20px 50px rgba(30,20,20,.18);opacity:0;visibility:hidden;transform:translateY(-6px);transition:opacity .16s ease,transform .16s ease,visibility .16s ease;pointer-events:none}.alert-cell:hover .alert-popover,.alert-popover.popover-open{opacity:1;visibility:visible;transform:translateY(0);pointer-events:auto}.popover-header{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;padding:.15rem .1rem .8rem;border-bottom:1px solid var(--app-border)}.popover-header strong{display:block;font-size:.95rem}.popover-header>div>span{display:block;margin-top:.15rem;color:var(--app-muted);font-size:.75rem}.popover-level{display:inline-flex!important;align-items:center;gap:.35rem;white-space:nowrap;font-size:.72rem!important;font-weight:800}.mini-dot{width:.45rem;height:.45rem}.alert-history{display:grid;max-height:20rem;gap:.55rem;overflow-y:auto;padding:.75rem 0}.alert-history-item{display:flex;gap:.65rem;padding:.75rem;border:1px solid var(--app-border);border-radius:12px;background:var(--app-surface-strong)}.history-number{display:grid;width:2rem;height:2rem;min-width:2rem;place-items:center;border-radius:50%;background:var(--app-accent-soft);color:var(--app-accent);font-size:.75rem;font-weight:900}.history-number.level-1{color:#278653;background:rgba(39,134,83,.11)}.history-number.level-2{color:#b67813;background:rgba(182,120,19,.11)}.history-number.level-3{color:#d33737;background:rgba(211,55,55,.11)}.history-content{min-width:0;flex:1}.history-top{display:flex;align-items:center;justify-content:space-between;gap:.5rem}.history-top strong{font-size:.78rem}.history-top time{color:var(--app-muted);font-size:.68rem;white-space:nowrap;font-variant-numeric:tabular-nums}.behaviour-list{margin:.3rem 0 0;font-size:.8rem;line-height:1.55}.history-content small{display:block;margin-top:.4rem;color:var(--app-muted);font-size:.7rem;line-height:1.5}.history-content small strong{color:var(--app-text)}.history-actions{display:flex;gap:.35rem;margin-top:.55rem}.history-actions button{display:inline-flex;align-items:center;gap:.25rem;padding:.3rem .5rem;border:1px solid var(--app-border);border-radius:7px;background:transparent;color:var(--app-muted);cursor:pointer;font:inherit;font-size:.7rem;font-weight:700}.history-actions button:hover{border-color:var(--app-accent);color:var(--app-accent);background:var(--app-accent-soft)}.history-actions .history-delete:hover{border-color:#d33737;color:#d33737;background:rgba(211,55,55,.08)}.popover-footer{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding-top:.7rem;border-top:1px solid var(--app-border);color:var(--app-muted);font-size:.72rem}.popover-footer button{border:0;background:transparent;color:var(--app-accent);cursor:pointer;font:inherit;font-weight:800}.latest-behaviour{display:block;overflow-wrap:anywhere;line-height:1.6}.record-list td:nth-child(5){font-variant-numeric:tabular-nums}.row-actions{display:flex;gap:.25rem}.row-actions button{display:grid;width:2.15rem;height:2.15rem;place-items:center;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--app-muted);cursor:pointer}.row-actions button:hover{border-color:var(--app-border);background:var(--app-accent-soft);color:var(--app-accent)}.eye-icon{position:relative;display:inline-block;width:1rem;height:.65rem;border:1.5px solid currentColor;border-radius:70%/90%}.eye-icon:after{content:'';position:absolute;top:50%;left:50%;width:.28rem;height:.28rem;border-radius:50%;background:currentColor;transform:translate(-50%,-50%)}.empty-state{padding:3rem 1.5rem;border:1px dashed var(--app-border);border-radius:16px;background:var(--app-surface);color:var(--app-muted);text-align:center}
.student-picker{position:relative;width:100%}.student-picker-trigger{width:100%;min-height:2.7rem;display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.6rem .7rem;border:1px solid var(--app-border);border-radius:10px;background:var(--app-surface-strong);color:var(--app-text);cursor:pointer;font:inherit;text-align:start}.student-picker-trigger:hover,.student-picker-trigger[aria-expanded=true]{border-color:var(--app-accent);box-shadow:0 0 0 3px var(--app-accent-soft)}.student-picker-chevron{color:var(--app-muted)}.student-dropdown{position:absolute;z-index:80;top:calc(100% + .4rem);inset-inline:0;max-height:min(30rem,58vh);overflow-y:auto;padding:.55rem;border:1px solid var(--app-border);border-radius:14px;background:var(--app-surface);box-shadow:0 20px 45px rgba(30,20,20,.18)}.student-class-group{margin-bottom:.7rem}.student-class-header{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:.6rem .75rem;margin-bottom:.3rem;border-radius:9px;background:var(--app-accent);color:#fff;font-weight:800;font-size:.82rem}.student-class-count{min-width:1.55rem;height:1.55rem;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:rgba(255,255,255,.18);font-size:.7rem}.student-class-list{display:flex;flex-direction:column;gap:.25rem}.student-option{width:100%;min-height:2.8rem;padding:.55rem .7rem;border:1px solid var(--app-border);border-radius:9px;background:var(--app-surface-strong);color:var(--app-text);display:flex;align-items:center;justify-content:space-between;gap:.75rem;text-align:start;cursor:pointer;font:inherit;transition:.15s ease}.student-option:hover,.student-option.selected{border-color:var(--app-accent);background:var(--app-accent-soft)}.student-option-name{font-size:.9rem;font-weight:700}.student-option-class{flex-shrink:0;color:var(--app-muted);font-size:.75rem;direction:ltr}.student-no-results{padding:1.2rem;color:var(--app-muted);text-align:center;font-size:.85rem}
.modal-backdrop{position:fixed;z-index:100;inset:0;display:grid;overflow:auto;padding:1rem;place-items:center;background:rgba(20,14,16,.62);backdrop-filter:blur(5px)}.modal{position:relative;width:min(100%,42rem);max-height:calc(100dvh - 2rem);overflow:auto;padding:1.5rem;border:1px solid var(--app-border);border-radius:20px;background:var(--app-surface);color:var(--app-text);box-shadow:0 28px 70px rgba(20,14,16,.3)}.modal-close{position:absolute;top:.8rem;inset-inline-end:.8rem;display:grid;width:2.3rem;height:2.3rem;place-items:center;border:1px solid var(--app-border);border-radius:50%;background:var(--app-surface-strong);color:var(--app-text);cursor:pointer;font-size:1.2rem}.modal-close:hover{background:var(--app-accent-soft);color:var(--app-accent);border-color:var(--app-accent)}.modal h2{margin-bottom:1.2rem;font-size:1.55rem;letter-spacing:-.02em}.modal form{display:grid;gap:.9rem}.student-label,.other-field,.notes-field{display:grid;gap:.35rem;font-weight:800;font-size:.84rem}.selected-student{display:flex;flex-direction:column;gap:.15rem;padding:.75rem .85rem;border:1px solid rgba(139,30,63,.18);border-radius:11px;background:var(--app-accent-soft);color:var(--app-accent)}.selected-student span{color:var(--app-muted);font-size:.78rem}.modal fieldset{margin:0;padding:.9rem;border:1px solid var(--app-border);border-radius:12px;background:var(--app-surface-soft)}.modal legend{padding:0 .35rem;color:var(--app-muted);font-size:.78rem;font-weight:800}.behaviour-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.3rem;max-height:15rem;overflow-y:auto}.check-option{display:flex;min-height:2.7rem;align-items:center;gap:.65rem;padding:.45rem .55rem;border-radius:9px;color:var(--app-text);font-size:.86rem;cursor:pointer;transition:.15s ease}.check-option:hover{background:var(--app-accent-soft)}.check-option input{width:1.15rem;height:1.15rem;min-width:1.15rem;margin:0;accent-color:var(--app-accent);cursor:pointer}.check-option span{line-height:1.4}.summary-box{display:grid;gap:.6rem;padding:.9rem;border:1px solid rgba(139,30,63,.18);border-radius:13px;background:linear-gradient(145deg,var(--app-accent-soft),var(--app-surface-strong))}.summary-heading{display:flex;align-items:center;justify-content:space-between}.summary-heading>div{display:flex;align-items:center;gap:.6rem}.summary-icon{display:grid;width:2.1rem;height:2.1rem;place-items:center;border-radius:9px;background:var(--app-accent);color:#fff}.summary-heading strong{display:block}.summary-heading small{display:block;margin-top:.1rem;color:var(--app-muted);font-size:.7rem;font-weight:400}.summary-box textarea{width:100%;min-height:7rem;resize:vertical;line-height:1.6}.summary-note{margin:0;color:var(--app-muted);font-size:.72rem}.modal-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.45rem;margin-top:.25rem;padding-top:.25rem}.secondary-button{border:1px solid var(--app-border);background:var(--app-surface-strong);color:var(--app-text)}.secondary-button:hover{border-color:var(--app-accent);color:var(--app-accent);background:var(--app-accent-soft)}.form-error{margin:0;padding:.65rem .75rem;border:1px solid rgba(211,55,55,.2);border-radius:9px;background:rgba(211,55,55,.07);color:#d33737;font-size:.82rem;font-weight:700}
:global(html.dark) .modal,:global(html[data-theme='dark']) .modal,:global(body.dark) .modal,:global(body[data-theme='dark']) .modal{background:#18181B;color:#f7f1ef;border-color:#514749}:global(html.dark) .modal input,:global(html.dark) .modal textarea,:global(html.dark) .modal fieldset,:global(html.dark) .summary-box,:global(html[data-theme='dark']) .modal input,:global(html[data-theme='dark']) .modal textarea,:global(html[data-theme='dark']) .modal fieldset,:global(html[data-theme='dark']) .summary-box,:global(body.dark) .modal input,:global(body.dark) .modal textarea,:global(body.dark) .modal fieldset,:global(body.dark) .summary-box,:global(body[data-theme='dark']) .modal input,:global(body[data-theme='dark']) .modal textarea,:global(body[data-theme='dark']) .modal fieldset,:global(body[data-theme='dark']) .summary-box{background:#232327;color:#f7f1ef;border-color:#5b5052}:global(html.dark) .check-option,:global(html[data-theme='dark']) .check-option,:global(body.dark) .check-option,:global(body[data-theme='dark']) .check-option{color:#f7f1ef}:global(html.dark) .check-option:hover,:global(html[data-theme='dark']) .check-option:hover,:global(body.dark) .check-option:hover,:global(body[data-theme='dark']) .check-option:hover{background:#374151}:global(html.dark) .modal input::placeholder,:global(html.dark) .modal textarea::placeholder,:global(html[data-theme='dark']) .modal input::placeholder,:global(html[data-theme='dark']) .modal textarea::placeholder,:global(body.dark) .modal input::placeholder,:global(body.dark) .modal textarea::placeholder,:global(body[data-theme='dark']) .modal input::placeholder,:global(body[data-theme='dark']) .modal textarea::placeholder{color:#bdb1b3}:global(html.dark) .modal-close,:global(html[data-theme='dark']) .modal-close,:global(body.dark) .modal-close,:global(body[data-theme='dark']) .modal-close{background:#232327;color:#f7f1ef;border-color:#5b5052}
@media(max-width:900px){.filters{grid-template-columns:1fr 1fr}.search-field{grid-column:1/-1}.record-list th:nth-child(1),.record-list td:nth-child(1){width:22%}.record-list th:nth-child(4),.record-list td:nth-child(4){width:25%}}
@media(max-width:700px){.behaviour-page{padding-bottom:1rem}.page-heading{align-items:stretch;flex-direction:column;padding:1.1rem}.add-button{width:100%}.filters{grid-template-columns:1fr;padding:.7rem}.search-field{grid-column:auto}.record-list{border:0;box-shadow:none;background:transparent}.record-list table{display:block}.record-list thead{display:none}.record-list tbody{display:grid;gap:.65rem}.record-list tr{display:grid;grid-template-columns:1fr 1fr;gap:.45rem .8rem;padding:.9rem;border:1px solid var(--app-border);border-radius:14px;background:var(--app-surface);box-shadow:0 4px 14px rgba(55,35,35,.05)}.record-list td{display:block;padding:.1rem 0;border:0;max-width:none;overflow:visible;font-size:1rem}.record-list td:nth-child(1){grid-column:1/-1;width:auto}.record-list td:nth-child(2){width:auto}.record-list td:nth-child(3),.record-list td:nth-child(4),.record-list td:nth-child(5),.record-list td:nth-child(6){grid-column:1/-1;width:auto}.record-list td:nth-child(3):before,.record-list td:nth-child(4):before,.record-list td:nth-child(5):before{display:block;margin-bottom:.18rem;color:var(--app-muted);font-size:.78rem;font-weight:800;text-transform:uppercase}.record-list td:nth-child(3):before{content:'Alerts'}.record-list td:nth-child(4):before{content:'Latest behaviour'}.record-list td:nth-child(5):before{content:'Latest date'}.row-actions{justify-content:flex-end}.alert-popover{position:fixed;z-index:200;top:auto;bottom:.6rem;inset-inline:.6rem;width:auto;max-height:72dvh;overflow:auto;border-radius:16px;box-shadow:0 24px 55px rgba(0,0,0,.28)}.alert-cell:hover .alert-popover{opacity:0;visibility:hidden;pointer-events:none;transform:translateY(.5rem)}.alert-popover.popover-open{opacity:1;visibility:visible;pointer-events:auto;transform:translateY(0)}.popover-header{position:sticky;top:0;background:var(--app-surface);z-index:1}.alert-history{max-height:none}.modal-backdrop{align-items:end;padding:.5rem}.modal{width:100%;max-height:calc(100dvh - 1rem);border-radius:18px 18px 0 0;padding:1rem}.behaviour-options{grid-template-columns:1fr}.modal-actions{position:sticky;bottom:0;padding-top:.7rem;background:inherit}.modal-actions button{flex:1;min-width:7rem}}
@media(max-width:430px){h1{font-size:1.75rem}.filters{gap:.55rem}.record-list tr{padding:.8rem}.student-dropdown{max-height:50vh}.history-top{align-items:flex-start;flex-direction:column}.history-top time{white-space:normal}.modal-actions button{min-width:0}.add-button,.primary-button,.secondary-button{font-size:1rem}}
@media(prefers-reduced-motion:reduce){.behaviour-page,.add-button,.primary-button,.secondary-button,.alert-trigger,.alert-popover,.student-option{animation:none;transition:none}}
@keyframes page-enter{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
</style>
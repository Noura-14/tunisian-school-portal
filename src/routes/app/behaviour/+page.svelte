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

    .behaviour-page {

        animation: page-enter 300ms ease both;

    }

    .page-heading {

        display: flex;

        align-items: flex-start;

        justify-content: space-between;

        gap: 1rem;

        margin-bottom: 1rem;

    }

    .eyebrow {

        margin: 0 0 0.35rem;

        color: var(--app-accent);

        font-size: 0.78rem;

        font-weight: 700;

    }

    h1,

    h2,

    p {

        margin-top: 0;

    }

    h1 {

        margin-bottom: 0.25rem;

        font-size: clamp(1.6rem, 4vw, 2.2rem);

    }

    .page-heading p:last-child {

        margin: 0;

        color: var(--app-muted);

        font-size: 0.9rem;

    }

    .add-button,

    .primary-button,

    .secondary-button {

        min-height: 2.7rem;

        padding: 0.6rem 0.85rem;

        border-radius: 0.5rem;

        cursor: pointer;

        font: inherit;

        font-weight: 700;

        transition:

            transform 160ms ease,

            background 160ms ease,

            border-color 160ms ease;

    }

    .add-button,

    .primary-button {

        border: 0;

        background: var(--app-accent);

        color: #fff;

    }

    .add-button:hover,

    .primary-button:hover {

        background: var(--app-accent-dark);

        transform: translateY(-1px);

    }

    .filters {

        display: flex;

        align-items: end;

        gap: 0.55rem;

        margin-bottom: 0.7rem;

        padding: 0.7rem;

        border: 1px solid var(--app-border);

        background: var(--app-surface);

    }

    .search-field {

        display: flex;

        min-height: 2.55rem;

        flex: 1;

        align-items: center;

        gap: 0.4rem;

        padding: 0 0.6rem;

        border: 1px solid var(--app-border);

        background: var(--app-surface-strong);

        color: var(--app-accent);

    }

    .search-field input {

        width: 100%;

        border: 0;

        outline: 0;

        background: transparent;

        color: var(--app-text);

        font: inherit;

    }

    .filters label:not(.search-field) {

        display: flex;

        min-width: 8rem;

        flex-direction: column;

        gap: 0.2rem;

        color: var(--app-muted);

        font-size: 0.72rem;

    }

    .filters select,

    .modal input,

    .modal select,

    .modal textarea {

        min-height: 2.55rem;

        padding: 0.55rem 0.65rem;

        border: 1px solid var(--app-border);

        border-radius: 0.4rem;

        background: var(--app-surface-strong);

        color: var(--app-text);

        font: inherit;

        outline: none;

    }

    .filters select:focus,

    .modal input:focus,

    .modal select:focus,

    .modal textarea:focus {

        border-color: var(--app-accent);

        box-shadow:

            0 0 0 2px var(--app-accent-soft);

    }

    .record-list {

    width: 100%;

    overflow-x: auto;

    border: 1px solid var(--app-border);

    background: var(--app-surface);

    box-shadow: var(--app-shadow);

}
    .student-picker {
        position: relative;
        width: 100%;
    }

    .student-picker-trigger {
        width: 100%;
        min-height: 2.55rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.55rem 0.65rem;
        border: 1px solid var(--app-border);
        border-radius: 0.4rem;
        background: var(--app-surface-strong);
        color: var(--app-text);
        cursor: pointer;
        font: inherit;
        text-align: start;
    }

    .student-picker-trigger:hover,
    .student-picker-trigger[aria-expanded="true"] {
        border-color: var(--app-accent);
    }

    .student-picker-chevron {
        flex: 0 0 auto;
        color: var(--app-muted);
        font-size: 1rem;
    }

    .student-dropdown {
        position: absolute;
        z-index: 80;
        top: calc(100% + 0.35rem);
        inset-inline: 0;
        max-height: min(28rem, 55vh);
        overflow-y: auto;
        padding: 0.55rem;
        border: 1px solid var(--app-border);
        border-radius: 0.65rem;
        background: var(--app-surface);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.16);
    }

.student-class-group {
    margin-bottom: 14px;
}

.student-class-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    margin-bottom: 4px;
    border-radius: 10px;
    background: var(--app-accent);
    color: white;
    font-weight: 700;
    font-size: 15px;
    position: sticky;
    top: 0;
    z-index: 2;
}

.student-class-count {
    min-width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.18);
    font-size: 13px;
}

.student-class-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.student-option {
    width: 100%;
    min-height: 46px;
    padding: 10px 12px;
    border: 1px solid var(--app-border);
    border-radius: 10px;
    background: var(--app-surface-strong);
    color: var(--app-text);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    text-align: right;
    cursor: pointer;
    transition:
        background 160ms ease,
        border-color 160ms ease,
        transform 160ms ease;
}

.student-option:hover {
    background: rgba(139, 30, 63, 0.05);
    border-color: var(--app-accent);
}

.student-option:active {
    transform: scale(0.99);
}

.student-option.selected {
    border-color: var(--app-accent);
    background: rgba(139, 30, 63, 0.08);
}

.student-option-name {
    font-weight: 600;
    font-size: 16px;
}

.student-option-class {
    flex-shrink: 0;
    font-size: 14px;
    color: var(--app-muted);
    direction: ltr;
}

    .student-no-results {
        padding: 1rem;
        color: var(--app-muted);
        text-align: center;
        font-size: 0.85rem;
    }

    table {

        width: 100%;

        min-width: 0;

        table-layout: fixed;

        border-collapse: collapse;

    }

    th,

    td {

        padding: 0.95rem 1rem;

        border-bottom: 1px solid var(--app-border);

        text-align: start;

        vertical-align: middle;

        line-height: 1.55;

    }

    th {

        background: var(--app-surface-soft);

        color: var(--app-muted);

        font-size: 0.75rem;

    }

    td {

        max-width: none;

        overflow: visible;

        font-size: 0.82rem;

    }

    th:nth-child(1),

    td:nth-child(1) {

        width: 16%;

    }

    th:nth-child(2),

    td:nth-child(2) {

        width: 9%;

    }

    th:nth-child(3),

    td:nth-child(3) {

        width: 14%;

    }

    th:nth-child(4),

    td:nth-child(4) {

        width: 31%;

    }

    th:nth-child(5),

    td:nth-child(5) {

        width: 20%;

    }

    th:nth-child(6),

    td:nth-child(6) {

        width: 10%;

    }

    tbody tr:last-child td {

        border-bottom: 0;

    }

    tbody tr {

        transition: background 150ms ease;

    }

    tbody tr:hover {

        background: var(--app-surface-soft);

    }

    /* ================================

       ALERT BADGE

       ================================ */

    .alert-cell {

        position: relative;

        display: inline-flex;

        align-items: center;

    }

    .alert-trigger {

        display: inline-flex;

        min-height: 2.1rem;

        align-items: center;

        gap: 0.4rem;

        padding: 0.35rem 0.6rem;

        border: 1px solid var(--app-border);

        border-radius: 999px;

        background: var(--app-surface-strong);

        color: var(--app-text);

        cursor: pointer;

        font: inherit;

        font-size: 0.78rem;

        font-weight: 700;

        transition:

            background 160ms ease,

            border-color 160ms ease,

            transform 160ms ease;

    }

    .alert-trigger:hover {

        transform: translateY(-1px);

        border-color: var(--app-accent);

        background: var(--app-accent-soft);

    }

    .alert-dot,

    .mini-dot {

        display: inline-block;

        width: 0.55rem;

        height: 0.55rem;

        border-radius: 50%;

        background: currentColor;

    }

    .alert-trigger.level-1,

    .popover-level.level-1 {

        color: #27965a;

    }

    .alert-trigger.level-2,

    .popover-level.level-2 {

        color: #c18416;

    }

    .alert-trigger.level-3,

    .popover-level.level-3 {

        color: #d73535;

    }

    .alert-arrow {

        font-size: 0.9rem;

        line-height: 1;

    }

    /* ================================

       ALERT POPOVER

       ================================ */

    .alert-popover {

        position: absolute;

        z-index: 50;

        top: calc(100% + 0.5rem);

        inset-inline-start: 0;

        width: min(32rem, 82vw);

        padding: 0.9rem;

        border: 1px solid var(--app-border);

        border-radius: 0.8rem;

        background: var(--app-surface);

        color: var(--app-text);

        box-shadow:

            0 16px 40px rgba(0, 0, 0, 0.16);

        opacity: 0;

        visibility: hidden;

        transform: translateY(-0.35rem);

        transition:

            opacity 150ms ease,

            transform 150ms ease,

            visibility 150ms ease;

        pointer-events: none;

    }

    .alert-cell:hover .alert-popover,

    .alert-popover.popover-open {

        opacity: 1;

        visibility: visible;

        transform: translateY(0);

        pointer-events: auto;

    }

    .popover-header {

        display: flex;

        align-items: flex-start;

        justify-content: space-between;

        gap: 0.75rem;

        padding-bottom: 0.7rem;

        border-bottom: 1px solid var(--app-border);

    }

    .popover-header strong {

        display: block;

        font-size: 0.9rem;

    }

    .popover-header > div > span {

        display: block;

        margin-top: 0.15rem;

        color: var(--app-muted);

        font-size: 0.72rem;

    }

    .popover-level {

        display: inline-flex !important;

        align-items: center;

        gap: 0.3rem;

        white-space: nowrap;

        font-size: 0.72rem !important;

        font-weight: 700;

    }

    .mini-dot {

        width: 0.45rem;

        height: 0.45rem;

    }

    .alert-history {

        display: grid;

        max-height: 19rem;

        gap: 0.5rem;

        overflow-y: auto;

        padding: 0.7rem 0;

    }

    .alert-history-item {

        display: flex;

        gap: 0.6rem;

        padding: 0.65rem;

        border: 1px solid var(--app-border);

        border-radius: 0.55rem;

        background: var(--app-surface-strong);

    }

    .history-number {

        display: grid;

        width: 1.8rem;

        height: 1.8rem;

        min-width: 1.8rem;

        place-items: center;

        border-radius: 50%;

        background: var(--app-accent-soft);

        color: var(--app-accent);

        font-size: 0.7rem;

        font-weight: 800;

    }

    .history-number.level-1 {

        color: #27965a;

        background: rgba(39, 150, 90, 0.12);

    }

    .history-number.level-2 {

        color: #c18416;

        background: rgba(193, 132, 22, 0.12);

    }

    .history-number.level-3 {

        color: #d73535;

        background: rgba(215, 53, 53, 0.12);

    }

    .history-content {

        min-width: 0;

        flex: 1;

    }

    .history-top {

        display: flex;

        align-items: center;

        justify-content: space-between;

        gap: 0.5rem;

    }

    .history-top strong {

        font-size: 0.76rem;

    }

    .history-top time {

        color: var(--app-muted);

        font-size: 0.68rem;

        white-space: nowrap;

        font-variant-numeric: tabular-nums;

    }

    .behaviour-list {

        margin: 0.3rem 0 0;

        color: var(--app-text);

        font-size: 0.76rem;

        line-height: 1.5;

        white-space: normal;

    }

    .history-content small {

        display: block;

        margin-top: 0.35rem;

        color: var(--app-muted);

        font-size: 0.68rem;

        line-height: 1.45;

        white-space: normal;

    }

    .history-content small strong {

        color: var(--app-text);

    }

    .history-actions {

        display: flex;

        gap: 0.25rem;

        margin-top: 0.5rem;

    }

    .history-actions button {

        display: inline-flex;

        align-items: center;

        gap: 0.25rem;

        padding: 0.25rem 0.45rem;

        border: 1px solid var(--app-border);

        border-radius: 0.35rem;

        background: transparent;

        color: var(--app-muted);

        cursor: pointer;

        font: inherit;

        font-size: 0.68rem;

    }

    .history-actions button:hover {

        border-color: var(--app-accent);

        color: var(--app-accent);

        background: var(--app-accent-soft);

    }

    .history-actions .history-delete:hover {

        border-color: #d73535;

        color: #d73535;

        background: rgba(215, 53, 53, 0.08);

    }

    .popover-footer {

        display: flex;

        align-items: center;

        justify-content: space-between;

        gap: 0.5rem;

        padding-top: 0.65rem;

        border-top: 1px solid var(--app-border);

        color: var(--app-muted);

        font-size: 0.7rem;

    }

    .popover-footer button {

        border: 0;

        background: transparent;

        color: var(--app-accent);

        cursor: pointer;

        font: inherit;

        font-weight: 700;

    }

    .latest-behaviour {

        display: block;

        width: 100%;

        max-width: none;

        overflow: visible;

        white-space: normal;

        overflow-wrap: anywhere;

        word-break: normal;

        line-height: 1.6;

    }

    .record-list td:nth-child(5) {

        white-space: normal;

        font-variant-numeric: tabular-nums;

        line-height: 1.45;

    }

    /* ================================

       ACTIONS

       ================================ */

    .row-actions {

        display: flex;

        gap: 0.2rem;

    }

    .row-actions button {

        display: grid;

        width: 2rem;

        height: 2rem;

        place-items: center;

        border: 0;

        border-radius: 0.35rem;

        background: transparent;

        color: var(--app-muted);

        cursor: pointer;

    }

    .row-actions button:hover {

        background: var(--app-accent-soft);

        color: var(--app-accent);

    }

    .eye-icon {
        position: relative;
        display: inline-block;
        width: 1rem;
        height: 0.65rem;
        border: 1.5px solid currentColor;
        border-radius: 70% / 90%;
        flex-shrink: 0;
    }

    .eye-icon::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0.28rem;
        height: 0.28rem;
        border-radius: 50%;
        background: currentColor;
        transform: translate(-50%, -50%);
    }

    .empty-state {

        padding: 1.5rem;

        border: 1px dashed var(--app-border);

        color: var(--app-muted);

        text-align: center;

    }

    /* ================================

       MODAL

       ================================ */

    .modal-backdrop {

        position: fixed;

        z-index: 20;

        inset: 0;

        display: grid;

        overflow: auto;

        padding: 1rem;

        place-items: center;

        background: rgba(20, 16, 17, 0.58);

        backdrop-filter: blur(3px);

    }

    .modal {

        position: relative;

        width: min(100%, 34rem);

        max-height: calc(100dvh - 2rem);

        overflow: auto;

        padding: 1.4rem;

        border: 1px solid var(--app-border);

        border-radius: 0.9rem;

        background: var(--app-surface);

        color: var(--app-text);

        box-shadow: var(--app-shadow);

    }

    .modal-close {

        position: absolute;

        top: 0.65rem;

        inset-inline-end: 0.65rem;

        display: grid;

        width: 2.2rem;

        height: 2.2rem;

        place-items: center;

        border: 1px solid var(--app-border);

        border-radius: 50%;

        background: var(--app-surface-strong);

        color: var(--app-text);

        cursor: pointer;

        font-size: 1.2rem;

    }

    .modal-close:hover {

        background: var(--app-accent-soft);

        color: var(--app-accent);

    }

    .modal h2 {

        margin-bottom: 1rem;

        font-size: 1.5rem;

    }

    .modal form {

        display: grid;

        gap: 0.8rem;

    }

    .student-label,

    .other-field,

    .notes-field {

        display: grid;

        gap: 0.3rem;

        font-weight: 700;

    }

    .selected-student {

        display: flex;

        flex-direction: column;

        gap: 0.15rem;

        padding: 0.7rem 0.8rem;

        border: 1px solid var(--app-accent-soft);

        border-radius: 0.5rem;

        background: var(--app-accent-soft);

        color: var(--app-accent);

    }

    .selected-student span {

        color: var(--app-muted);

        font-size: 0.82rem;

    }

    .modal fieldset {

        margin: 0;

        padding: 0.75rem;

        border: 1px solid var(--app-border);

        border-radius: 0.55rem;

        background: var(--app-surface-strong);

    }

    .modal legend {

        padding: 0 0.35rem;

        color: var(--app-muted);

        font-size: 0.8rem;

        font-weight: 700;

    }

    .behaviour-options {

        display: grid;

        gap: 0.25rem;

        max-height: 12rem;

        overflow-y: auto;

        padding-inline-end: 0.15rem;

    }

    .check-option {

        display: flex;

        min-height: 2.45rem;

        align-items: center;

        gap: 0.65rem;

        padding: 0.35rem 0.45rem;

        border-radius: 0.4rem;

        color: var(--app-text);

        font-size: 0.88rem;

        cursor: pointer;

    }

    .check-option:hover {

        background: var(--app-accent-soft);

    }

    .check-option input {

        width: 1.15rem;

        height: 1.15rem;

        min-width: 1.15rem;

        margin: 0;

        accent-color: var(--app-accent);

        cursor: pointer;

    }

    .check-option span {

        line-height: 1.35;

    }

    .summary-box {

        display: grid;

        gap: 0.55rem;

        padding: 0.8rem;

        border: 1px solid var(--app-accent-soft);

        border-radius: 0.65rem;

        background: var(--app-surface-strong);

    }

    .summary-heading {

        display: flex;

        align-items: center;

        justify-content: space-between;

    }

    .summary-heading > div {

        display: flex;

        align-items: center;

        gap: 0.55rem;

    }

    .summary-icon {

        display: grid;

        width: 2rem;

        height: 2rem;

        place-items: center;

        border-radius: 0.45rem;

        background: var(--app-accent-soft);

    }

    .summary-heading strong {

        display: block;

        color: var(--app-text);

    }

    .summary-heading small {

        display: block;

        margin-top: 0.1rem;

        color: var(--app-muted);

        font-size: 0.72rem;

        font-weight: 400;

    }

    .summary-box textarea {

        width: 100%;

        min-height: 6rem;

        resize: vertical;

        line-height: 1.55;

    }

    .summary-note {

        margin: 0;

        color: var(--app-muted);

        font-size: 0.72rem;

    }

    .modal-actions {

        display: flex;

        flex-wrap: wrap;

        justify-content: flex-end;

        gap: 0.45rem;

        margin-top: 0.2rem;

    }

    .secondary-button {

        border: 1px solid var(--app-border);

        background: var(--app-surface-strong);

        color: var(--app-text);

    }

    .secondary-button:hover {

        border-color: var(--app-accent);

        color: var(--app-accent);

    }

    .form-error {

        margin: 0;

        color: #d32f2f;

        font-size: 0.82rem;

        font-weight: 600;

    }

    /* ================================

       DARK MODE

       ================================ */

    :global(html.dark) .modal,

    :global(html[data-theme='dark']) .modal,

    :global(body.dark) .modal,

    :global(body[data-theme='dark']) .modal {

        background: #272223;

        color: #f7f1ef;

        border-color: #514749;

    }

    :global(html.dark) .modal input,

    :global(html.dark) .modal select,

    :global(html.dark) .modal textarea,

    :global(html.dark) .modal fieldset,

    :global(html.dark) .summary-box,

    :global(html[data-theme='dark']) .modal input,

    :global(html[data-theme='dark']) .modal select,

    :global(html[data-theme='dark']) .modal textarea,

    :global(html[data-theme='dark']) .modal fieldset,

    :global(html[data-theme='dark']) .summary-box,

    :global(body.dark) .modal input,

    :global(body.dark) .modal select,

    :global(body.dark) .modal textarea,

    :global(body.dark) .modal fieldset,

    :global(body.dark) .summary-box,

    :global(body[data-theme='dark']) .modal input,

    :global(body[data-theme='dark']) .modal select,

    :global(body[data-theme='dark']) .modal textarea,

    :global(body[data-theme='dark']) .modal fieldset,

    :global(body[data-theme='dark']) .summary-box {

        background: #332d2f;

        color: #f7f1ef;

        border-color: #5b5052;

    }

    :global(html.dark) .check-option,

    :global(html[data-theme='dark']) .check-option,

    :global(body.dark) .check-option,

    :global(body[data-theme='dark']) .check-option {

        color: #f7f1ef;

    }

    :global(html.dark) .check-option:hover,

    :global(html[data-theme='dark']) .check-option:hover,

    :global(body.dark) .check-option:hover,

    :global(body[data-theme='dark']) .check-option:hover {

        background: #44383b;

    }

    :global(html.dark) .modal input::placeholder,

    :global(html.dark) .modal textarea::placeholder,

    :global(html[data-theme='dark']) .modal input::placeholder,

    :global(html[data-theme='dark']) .modal textarea::placeholder,

    :global(body.dark) .modal input::placeholder,

    :global(body.dark) .modal textarea::placeholder,

    :global(body[data-theme='dark']) .modal input::placeholder,

    :global(body[data-theme='dark']) .modal textarea::placeholder {

        color: #bdb1b3;

    }

    :global(html.dark) .modal-close,

    :global(html[data-theme='dark']) .modal-close,

    :global(body.dark) .modal-close,

    :global(body[data-theme='dark']) .modal-close {

        background: #332d2f;

        color: #f7f1ef;

        border-color: #5b5052;

    }

    /* ================================

       MOBILE

       ================================ */

    @media (max-width: 700px) {

        .page-heading {

            flex-direction: column;

        }

        .add-button {

            width: 100%;

        }

        .filters {

            align-items: stretch;

            flex-direction: column;

        }

        .filters label:not(.search-field) {

            min-width: 0;

        }

        .record-list {

            overflow: visible;

            border: 0;

            box-shadow: none;

            background: transparent;

        }

        .record-list table {

            display: block;

            min-width: 0;

        }

        .record-list thead {

            display: none;

        }

        .record-list tbody {

            display: grid;

            gap: 0.4rem;

        }

        .record-list tr {

            display: grid;

            grid-template-columns: 1fr 1fr;

            gap: 0.35rem 0.6rem;

            padding: 0.7rem;

            border: 1px solid var(--app-border);

            border-radius: 0.55rem;

            background: var(--app-surface);

        }

        .record-list td {

            display: block;

            max-width: none;

            padding: 0.15rem 0;

            border: 0;

            white-space: normal;

            overflow: visible;

        }

        .record-list td:nth-child(3),

        .record-list td:nth-child(4),

        .record-list td:nth-child(5),

        .record-list td:nth-child(6) {

            grid-column: 1 / -1;

        }

        .latest-behaviour {

            max-width: none;

            white-space: normal;

        }

        .record-list td:nth-child(5) {

            white-space: normal;

        }

        .alert-popover {

            position: fixed;

            z-index: 100;

            top: auto;

            bottom: 0.6rem;

            inset-inline: 0.6rem;

            width: auto;

            max-height: 72dvh;

            overflow: auto;

            border-radius: 0.9rem;

            box-shadow:

                0 18px 45px rgba(0, 0, 0, 0.28);

        }

        .alert-cell:hover .alert-popover {

            opacity: 0;

            visibility: hidden;

            pointer-events: none;

            transform: translateY(0.5rem);

        }

        .alert-popover.popover-open {

            opacity: 1;

            visibility: visible;

            pointer-events: auto;

            transform: translateY(0);

        }

        .popover-header {

            position: sticky;

            top: 0;

            background: var(--app-surface);

            z-index: 1;

        }

        .alert-history {

            max-height: none;

        }

        .modal-backdrop {

            align-items: end;

            padding: 0.5rem;

        }

        .modal {

            width: 100%;

            max-height: calc(100dvh - 1rem);

            border-radius: 0.9rem 0.9rem 0 0;

            padding: 1rem;

        }

        .modal-actions {

            position: sticky;

            bottom: 0;

            padding-top: 0.6rem;

            background: inherit;

        }

        .modal-actions button {

            flex: 1;

            min-width: 7rem;

        }

    }

    @media (prefers-reduced-motion: reduce) {

        .behaviour-page {

            animation: none;

        }

    }

    @keyframes page-enter {

        from {

            opacity: 0;

            transform: translateY(0.35rem);

        }

        to {

            opacity: 1;

            transform: translateY(0);

        }

    }

</style>
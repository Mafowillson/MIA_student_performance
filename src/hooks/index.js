// Named hooks that components use to reach the data-access layer
// (src/data/api.js). Components must go through these — never import
// src/data/mockData.js directly.
import { useAsync } from './useAsync';
import * as api from '../data/api';

export function useDemoAccounts() {
  return useAsync(() => api.getDemoAccounts(), []);
}

// Regional Supervisor admin management (Regional Coordinators / HODs /
// Center Coordinators). Mutating calls (createAdmin/updateAdmin/deleteAdmin)
// are called directly from components, same pattern as saveManualMarks etc.
export function useAdmins(role) {
  return useAsync(() => api.getAdmins(role), [role]);
}

// Center Coordinator mentor management, scoped to their own center.
export function useMentorsByCenter(centerId) {
  return useAsync(() => api.getMentorsByCenter(centerId), [centerId]);
}

export function useCategories() {
  return useAsync(() => api.getCategories(), []);
}

export function useSubjects(filters = {}) {
  return useAsync(() => api.getSubjects(filters), [filters.categoryId]);
}

export function useSubject(subjectId) {
  return useAsync(() => api.getSubjectById(subjectId), [subjectId]);
}

export function useCenters() {
  return useAsync(() => api.getCenters(), []);
}

export function useCenter(centerId) {
  return useAsync(() => api.getCenterById(centerId), [centerId]);
}

export function useMentors() {
  return useAsync(() => api.getMentors(), []);
}

export function useMentor(mentorId) {
  return useAsync(() => api.getMentorById(mentorId), [mentorId]);
}

export function useHods() {
  return useAsync(() => api.getHods(), []);
}

export function useHod(hodId) {
  return useAsync(() => api.getHodById(hodId), [hodId]);
}

export function useRegionalCoordinators() {
  return useAsync(() => api.getRegionalCoordinators(), []);
}

export function useCenterCoordinators() {
  return useAsync(() => api.getCenterCoordinators(), []);
}

export function useStudents(filters = {}) {
  return useAsync(
    () => api.getStudents(filters),
    [filters.centerId, filters.categoryId, filters.mentorId],
  );
}

export function useStudent(studentId) {
  return useAsync(() => api.getStudentById(studentId), [studentId]);
}

export function useSubjectHistories(studentId) {
  return useAsync(() => api.getSubjectHistories(studentId), [studentId]);
}

export function useAssessments(studentId, subjectId) {
  return useAsync(() => api.getScoreHistory(studentId, subjectId), [studentId, subjectId]);
}

export function useAtRiskFlags(studentId) {
  return useAsync(() => api.getStudentAnalysis(studentId), [studentId]);
}

export function useMentees(mentorId) {
  return useAsync(() => api.getMenteesWithStatus(mentorId), [mentorId]);
}

export function useCenterRoster(centerId, filters = {}) {
  return useAsync(() => api.getCenterRoster(centerId, filters), [centerId, filters.categoryId]);
}

export function useStudentsWithStatus(filters = {}) {
  return useAsync(
    () => api.getStudentsWithStatus(filters),
    [filters.centerId, filters.categoryId, filters.mentorId],
  );
}

export function useWeekOptions() {
  return useAsync(() => api.getWeekOptions(), []);
}

export function useManualEntryTable({ centerId, subjectId, week }) {
  return useAsync(
    () => (subjectId && week ? api.getManualEntryTable({ centerId, subjectId, week }) : Promise.resolve([])),
    [centerId, subjectId, week],
  );
}

export function useMarkEntryStatus() {
  return useAsync(() => api.getMarkEntryStatus(), []);
}

export function useRegionalSummary() {
  return useAsync(() => api.getRegionalSummary(), []);
}

export function useCategorySummary(categoryId) {
  return useAsync(() => api.getCategorySummary(categoryId), [categoryId]);
}

export function useSubjectSummary(subjectId) {
  return useAsync(() => api.getSubjectSummary(subjectId), [subjectId]);
}

export function useFollowUpNotes(studentId) {
  return useAsync(() => api.getFollowUpNotes(studentId), [studentId]);
}

export function useOutcomes(studentId) {
  return useAsync(() => api.getOutcomes(studentId), [studentId]);
}

export function useSharedStudentView(studentId) {
  return useAsync(() => api.getSharedStudentView(studentId), [studentId]);
}

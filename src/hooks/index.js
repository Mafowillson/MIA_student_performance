// Named hooks that components use to reach the data-access layer
// (src/data/api.js). Components must go through these — never import
// src/data/mockData.js directly.
import { useAsync } from './useAsync';
import * as api from '../data/api';

export function useDemoAccounts() {
  return useAsync(() => api.getDemoAccounts(), []);
}

// Regions & National Supervisor management (National Supervisor CRUDs
// Regional Supervisor accounts; mutating calls go straight to api.js).
export function useRegions() {
  return useAsync(() => api.getRegions(), []);
}

export function useRegion(regionId) {
  return useAsync(() => api.getRegionById(regionId), [regionId]);
}

export function useNationalSupervisor() {
  return useAsync(() => api.getNationalSupervisor(), []);
}

export function useRegionalSupervisors() {
  return useAsync(() => api.getRegionalSupervisors(), []);
}

export function useNationalSummary() {
  return useAsync(() => api.getNationalSummary(), []);
}

// Regional Supervisor admin management (Regional Coordinators / HODs /
// Center Coordinators), scoped to one region so a Regional Supervisor only
// ever sees their own region's people. Mutating calls (createAdmin/
// updateAdmin/deleteAdmin) are called directly from components, same
// pattern as saveManualMarks etc.
export function useAdmins(role, regionId) {
  return useAsync(() => api.getAdmins(role, regionId), [role, regionId]);
}

// Center Coordinator mentor management, scoped to their own center.
export function useMentorsByCenter(centerId) {
  return useAsync(() => api.getMentorsByCenter(centerId), [centerId]);
}

export function useCategories(filters = {}) {
  return useAsync(() => api.getCategories(filters), [filters.regionId]);
}

export function useSubjects(filters = {}) {
  return useAsync(() => api.getSubjects(filters), [filters.categoryId, filters.regionId]);
}

export function useSubject(subjectId) {
  return useAsync(() => api.getSubjectById(subjectId), [subjectId]);
}

export function useCenters(filters = {}) {
  return useAsync(() => api.getCenters(filters), [filters.regionId]);
}

export function useCenter(centerId) {
  return useAsync(() => api.getCenterById(centerId), [centerId]);
}

// Regional Supervisor center management, scoped to their own region.
// Mutating calls (createCenter/updateCenter/deleteCenter) are called
// directly from the component, same pattern as the other management screens.
export function useCentersManaged(regionId) {
  return useAsync(() => api.getCentersManaged(regionId), [regionId]);
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

// Anonymous-safe minimal roster (id/name/studentCode only) for the pre-login
// "preview a shared student page" dropdown — see getShareableStudents in
// src/data/api.js for why this can't just be useStudents().
export function useShareableStudents() {
  return useAsync(() => api.getShareableStudents(), []);
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

export function useMarkEntryStatus(regionId) {
  return useAsync(() => api.getMarkEntryStatus(regionId), [regionId]);
}

export function useRegionalSummary(regionId) {
  return useAsync(() => api.getRegionalSummary(regionId), [regionId]);
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

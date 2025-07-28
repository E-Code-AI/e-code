import { DatabaseStorage } from '../storage';

export interface Classroom {
  id: number;
  name: string;
  description: string;
  teacherId: number;
  code: string;
  settings: {
    allowLateSubmissions: boolean;
    autoGrading: boolean;
    collaborationEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  id: number;
  classroomId: number;
  title: string;
  description: string;
  dueDate: Date;
  points: number;
  rubric?: {
    criteria: {
      name: string;
      points: number;
      description: string;
    }[];
  };
  templateProjectId?: number;
  autoGradeTestsId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Submission {
  id: number;
  assignmentId: number;
  studentId: number;
  projectId: number;
  status: 'not_started' | 'in_progress' | 'submitted' | 'graded';
  submittedAt?: Date;
  grade?: number;
  feedback?: string;
  autoGradeResults?: {
    passed: number;
    failed: number;
    score: number;
    details: any[];
  };
}

export interface Student {
  id: number;
  userId: number;
  classroomId: number;
  enrolledAt: Date;
  progress: {
    assignmentsCompleted: number;
    averageGrade: number;
    lastActive: Date;
  };
}

export class EducationService {
  constructor(private storage: DatabaseStorage) {}

  async createClassroom(data: {
    name: string;
    description: string;
    teacherId: number;
    settings?: Partial<Classroom['settings']>;
  }): Promise<Classroom> {
    const classroom = {
      ...data,
      code: this.generateClassroomCode(),
      settings: {
        allowLateSubmissions: true,
        autoGrading: false,
        collaborationEnabled: true,
        ...data.settings
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const id = await this.storage.createClassroom(classroom);
    return { ...classroom, id };
  }

  private generateClassroomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async joinClassroom(code: string, studentUserId: number): Promise<void> {
    const classroom = await this.storage.getClassroomByCode(code);
    if (!classroom) {
      throw new Error('Invalid classroom code');
    }
    
    await this.storage.addStudentToClassroom(classroom.id, studentUserId);
  }

  async createAssignment(data: {
    classroomId: number;
    title: string;
    description: string;
    dueDate: Date;
    points: number;
    rubric?: Assignment['rubric'];
    templateProjectId?: number;
  }): Promise<Assignment> {
    const assignment = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const id = await this.storage.createAssignment(assignment);
    
    // Create submissions for all students
    const students = await this.storage.getClassroomStudents(data.classroomId);
    for (const student of students) {
      await this.storage.createSubmission({
        assignmentId: id,
        studentId: student.userId,
        status: 'not_started'
      });
    }
    
    return { ...assignment, id };
  }

  async submitAssignment(
    assignmentId: number, 
    studentId: number, 
    projectId: number
  ): Promise<void> {
    const submission = await this.storage.getSubmission(assignmentId, studentId);
    if (!submission) {
      throw new Error('Submission not found');
    }
    
    await this.storage.updateSubmission(submission.id, {
      projectId,
      status: 'submitted',
      submittedAt: new Date()
    });
    
    // Run auto-grading if enabled
    const assignment = await this.storage.getAssignment(assignmentId);
    if (assignment.autoGradeTestsId) {
      await this.runAutoGrading(submission.id, projectId, assignment.autoGradeTestsId);
    }
  }

  async runAutoGrading(
    submissionId: number, 
    projectId: number, 
    testsId: number
  ): Promise<void> {
    // Simulate auto-grading execution
    const results = {
      passed: Math.floor(Math.random() * 10),
      failed: Math.floor(Math.random() * 5),
      score: 0,
      details: []
    };
    
    results.score = (results.passed / (results.passed + results.failed)) * 100;
    
    await this.storage.updateSubmission(submissionId, {
      autoGradeResults: results,
      grade: results.score
    });
  }

  async gradeSubmission(
    submissionId: number,
    grade: number,
    feedback: string
  ): Promise<void> {
    await this.storage.updateSubmission(submissionId, {
      grade,
      feedback,
      status: 'graded'
    });
  }

  async getClassroomStats(classroomId: number): Promise<{
    totalStudents: number;
    totalAssignments: number;
    averageGrade: number;
    submissionRate: number;
    activeStudents: number;
  }> {
    const students = await this.storage.getClassroomStudents(classroomId);
    const assignments = await this.storage.getClassroomAssignments(classroomId);
    const submissions = await this.storage.getClassroomSubmissions(classroomId);
    
    const submittedCount = submissions.filter(s => s.status === 'submitted' || s.status === 'graded').length;
    const gradedSubmissions = submissions.filter(s => s.grade !== null);
    const averageGrade = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubmissions.length
      : 0;
    
    const activeStudents = students.filter(s => {
      const lastActive = new Date(s.progress.lastActive);
      const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceActive < 7;
    }).length;
    
    return {
      totalStudents: students.length,
      totalAssignments: assignments.length,
      averageGrade,
      submissionRate: submissions.length > 0 ? (submittedCount / submissions.length) * 100 : 0,
      activeStudents
    };
  }

  async getStudentProgress(studentId: number, classroomId: number): Promise<{
    assignments: {
      assignment: Assignment;
      submission: Submission;
    }[];
    overallGrade: number;
    completionRate: number;
    strengths: string[];
    improvements: string[];
  }> {
    const assignments = await this.storage.getClassroomAssignments(classroomId);
    const submissions = await this.storage.getStudentSubmissions(studentId, classroomId);
    
    const assignmentData = assignments.map(assignment => {
      const submission = submissions.find(s => s.assignmentId === assignment.id);
      return { assignment, submission: submission! };
    });
    
    const gradedSubmissions = submissions.filter(s => s.grade !== null);
    const overallGrade = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubmissions.length
      : 0;
    
    const completionRate = submissions.length > 0
      ? (submissions.filter(s => s.status === 'submitted' || s.status === 'graded').length / submissions.length) * 100
      : 0;
    
    return {
      assignments: assignmentData,
      overallGrade,
      completionRate,
      strengths: ['Problem Solving', 'Code Organization'],
      improvements: ['Testing', 'Documentation']
    };
  }
}
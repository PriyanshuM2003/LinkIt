export const server = process.env.REACT_APP_SERVER;

const apiList = {
  login: `${server}/auth/login`,
  signup: `${server}/auth/signup`,
  uploadResume: `${server}/upload/resume`,
  uploadProfileImage: `${server}/upload/profile`,
  jobs: `${server}/api/jobs`,
  applications: `${server}/api/applications`,
  rating: `${server}/api/rating`,
  user: `${server}/api/user`,
  applicants: `${server}/api/applicants`,
  verifyEmail: `${server}/auth/verify`,
  purchasePlan: `${server}/api/purchasePlan`,
  verifyPayment: `${server}/api/verifyPayment`,
  updatePlan: `${server}/api/updatePlan`,
  updatePremium: `${server}/api/updatePremium`,
  userPlanData: `${server}/api/userPlanData`,
};

export default apiList;

const express = require('express');
const router = express.Router();
const multer = require('multer');

const mainMiddleware = require("../middlewares/main.middleware");
const employeeController = require("../controllers/employee.controller");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/add_new_employee", mainMiddleware.protect, upload.fields([
  { name: 'aadhar_card' },
  { name: 'pan_card' },
  { name: 'passport_photo' },
  { name: 'employee_sign' },
  { name: 'tenth_certificate' },
  { name: 'twelfth_certificate' },
  { name: 'graduation_certificate' },
  { name: 'resume' },
  { name: 'previous_pay_slips' },
  { name: 'previous_offer_letter' },
  { name: 'previous_experience_letter' },
  { name: 'form_16' }
]), employeeController.addNewEmployee);

router.post("/upload_employee_document", mainMiddleware.protect, upload.fields([
  { name: 'aadhar_card' },
  { name: 'pan_card' },
  { name: 'passport_photo' },
  { name: 'employee_sign' },
  { name: 'tenth_certificate' },
  { name: 'twelfth_certificate' },
  { name: 'graduation_certificate' },
  { name: 'resume' },
  { name: 'previous_pay_slips' },
  { name: 'previous_offer_letter' },
  { name: 'previous_experience_letter' },
  { name: 'form_16' }
]), employeeController.uploadEmployeeDocument);

router.post("/update_employee_by_id", mainMiddleware.protect, employeeController.updateEmployee);
router.post("/update_employee_status", mainMiddleware.protect, employeeController.updateEmployeeStatus);
router.get("/team_hierarchy", employeeController.teamHierarchy);

router.get("/get_team_leads", employeeController.getTeamLeads);
router.get("/get_team_managers", employeeController.getTeamManagers);

router.get("/download_employee_list", employeeController.downloadEmployeeList);
router.post("/accept_rw_agreement", employeeController.acceptWRAgreement);
router.post("/get_remote_work_agreement_status", employeeController.getRemoteWorkAgreementStatus);

router.post("/update_employee_document_status", mainMiddleware.protect, employeeController.markDocumentOrFileInactive);

router.get("/get_all_employees_list", employeeController.getAllEmployeeList);
router.get("/get_all_employees", employeeController.getAll);

router.post("/get_team_member", employeeController.getTeamMember);
router.post("/get_employee_details", employeeController.getEmployeeDetails);

router.get("/:id", employeeController.getById);

module.exports = router;

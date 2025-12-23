const departmentModel = require("../models/department.model");
const departmentService = require("../services/department.service");

async function addDepartment(req, res) {
  let reqData = req.body.departments;

  reqData = reqData.map((item) => {
    return {
      department_name: item.name,
      status: item.status === "active" ? 1 : 0,
      // department_slug will be auto-generated in schema pre-hook
    };
  });

  await departmentService.addDepartment(reqData);

  return res.status(200).json({
    success: true,
    message: "Departments Added Successfully..!",
  });
}

async function getAllDepartments(req, res) {
  try {
    const data = await departmentService.getAllDepartments();

    return res.status(200).json({
      success: true,
      message: "Departments Fetched Successfully..!",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch departments",
      error: error.message,
    });
  }
}

async function getDepartmentById(req, res) {
  const _id = req.params._id;

  try {
    const data = await departmentService.getDepartmentById(_id);

    return res.status(200).json({
      success: true,
      message: "Department Fetched Successfully..!",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch departments",
      error: error.message,
    });
  }
}
async function updateDepartments(req, res) {
  try {
    const { department_id, status, department_name } = req.body;

    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: "Department ID is required.",
      });
    }

    const updateData = {
      $set: { status, department_name },
    };

    const data = await departmentModel.findOneAndUpdate(
      { _id: department_id },
      updateData,
      { new: true } // returns updated document
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Department updated successfully!",
      data, // send updated department back
    });
  } catch (error) {
    console.error("Error updating department:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}

module.exports = {
  addDepartment,
  getAllDepartments,
  updateDepartments,
  getDepartmentById,
  // deleteDepartments,
};

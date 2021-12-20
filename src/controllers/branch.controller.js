import Branch from "../models/Branch";

export const createBranch = async (req, res) => {
  const { branchName, adrress } = req.body;

  try {
    const newBranch = new Branch({
      branchName,
      adrress,
    });

    const branchSaved = await newBranch.save();

    res.status(201).json(branchSaved);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

export const getBranchById = async (req, res) => {
  const { branchId } = req.params;

  const branch = await Branch.findById(branchId);
  res.status(200).json(branch);
};

export const getBranches = async (req, res) => {
  const branches = await Branch.find();
  return res.json(branches);
};

export const updateBranchById = async (req, res) => {
  const updatedBranch = await Branch.findByIdAndUpdate(
    req.params.branchId,
    req.body,
    {
      new: true,
    }
  );
  res.status(204).json(updatedBranch);
};

export const deleteBranchById = async (req, res) => {
  const { branchId } = req.params;

  await Branch.findByIdAndDelete(branchId);

  // code 200 is ok too
  res.status(204).json();
};
